import "server-only";
import { db } from "./db";
import { parseSummary } from "./aiParse";

// AI 장소 요약: 장소 후보가 추가되면 한 번만 요약을 만들어 저장한다.
// 무료 Gemini API에서는 구글 검색(Grounding)을 쓸 수 없어서,
// 네이버 검색 API로 가게 정보와 블로그 후기를 찾고 Gemini에게는 그 내용만 근거로 요약을 시킨다.
// 키는 모두 환경변수에만 둔다.

export const aiEnabled = () =>
  Boolean(process.env.GEMINI_API_KEY && process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET);

const stripTags = (s = "") =>
  s.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

async function naver(kind, query, params = "") {
  const url = `https://openapi.naver.com/v1/search/${kind}.json?query=${encodeURIComponent(query)}${params}`;
  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID,
      "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET,
    },
  });
  if (!res.ok) throw new Error(`Naver ${kind} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).items || [];
}

// 네이버에서 가게(지역 검색)와 후기(블로그 검색)를 찾는다.
export async function searchPlace(name, region) {
  const query = [region, name].filter(Boolean).join(" ");
  const [places, blogs] = await Promise.all([
    naver("local", query, "&display=5"),
    naver("blog", `${query} 메뉴 가격`, "&display=10&sort=sim"),
  ]);
  return {
    places: places.map((p) => ({
      name: stripTags(p.title),
      category: p.category,
      address: p.roadAddress || p.address,
      link: p.link,
    })),
    blogs: blogs.map((b) => ({
      title: stripTags(b.title),
      text: stripTags(b.description),
      date: b.postdate ? `${b.postdate.slice(0, 4)}-${b.postdate.slice(4, 6)}` : "",
      link: b.link,
    })),
  };
}

function buildPrompt(name, region, found) {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const places = found.places.map((p, i) => `(${i + 1}) ${p.name} | ${p.category} | ${p.address}`).join("\n") || "없음";
  const blogs = found.blogs.map((b, i) => `[${i + 1}] (${b.date}) ${b.title} - ${b.text}`).join("\n") || "없음";
  return `오늘 날짜: ${today}
아래 "검색 결과"만 근거로, 정해진 항목만 한 줄씩 답해 줘.
장소: ${name}${region ? ` (${region})` : ""}

[네이버 지역 검색 결과]
${places}

[네이버 블로그 후기 일부]
${blogs}

종류: 국밥/고기/카페/술집/기타 중 하나
지점확인: "확인됨" 또는 "지점 확인 필요"
한줄요약: 30자 이내
주소:
대표메뉴: 최대 3개, 쉼표로 구분
가격범위: 최소~최대, 숫자만 (예: 9000~12000)
가격기준: 25자 이내 (예: 단품 국밥~수육백반 1인 / 2인 4인분 주문, 1인 2인분 기준)
가격시점: 가격이 나온 후기의 날짜 (예: 2025-12), 모르면 "정보 없음"
영업시간: HH:MM~HH:MM, 요일마다 다르면 "월~금 11:00~22:00, 토 12:00~21:00"처럼
브레이크타임: HH:MM~HH:MM, 없으면 "없음"
휴무일: 요일(예: 월), 없으면 "연중무휴"
후기요약: 2문장 이내

규칙:
1. 검색 결과에 나온 내용만 쓰고, 없으면 "정보 없음"이라고 써. 네가 원래 알던 내용은 쓰지 마.
2. 평점이나 숫자를 추측해서 만들지 마.
3. 가격은 오늘 날짜에 가까운 최신 후기를 우선하고, 그 후기의 날짜를 가격시점에 써.
4. 가격은 대표 메뉴를 1인이 한 끼 먹을 때 내는 금액이야.
   - 여럿이 나눠 먹는 메뉴는 1인 금액으로 나눠서 써.
   - 고깃집처럼 인분·g 단위면 보통 몇 인분을 시키는지 기준으로 1인 금액을 계산하고, 그 기준을 가격기준에 써.
   - 사이드 메뉴, 주류, 추가 사리는 빼.
5. 지역 검색 결과에 같은 이름의 다른 지점이 섞여 있거나, 후기가 다른 지점 이야기면 지점확인에 "지점 확인 필요"라고 써.
6. 항목 이름을 바꾸거나, 위에 없는 설명·안내 문장을 덧붙이지 마.`;
}

async function askGemini(prompt) {
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  // 요약은 깊게 생각할 일이 아니라서 thinking을 최소로 둔다.
  const thinkingConfig = model.startsWith("gemini-2") ? { thinkingBudget: 0 } : { thinkingLevel: "low" };
  const body = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { thinkingConfig, temperature: 0.2 },
  });
  // 사용자가 몰리면 503이 날 때가 있어서 한 번만 다시 시도한다.
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body,
    });
    if (res.ok) {
      const json = await res.json();
      return (json.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("\n");
    }
    if (res.status !== 503 || attempt === 1) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
    await new Promise((r) => setTimeout(r, 2000));
  }
}

export async function summarizePlace(candidateId) {
  const { data: c } = await db().from("candidates").select("*").eq("id", candidateId).maybeSingle();
  if (!c || c.kind !== "place") return;
  if (!aiEnabled()) {
    await db().from("candidates").update({ ai_status: "none" }).eq("id", c.id);
    return;
  }

  try {
    const found = await searchPlace(c.label, c.region);
    if (!found.places.length && !found.blogs.length) {
      await db().from("candidates").update({ ai_status: "failed" }).eq("id", c.id);
      return;
    }
    const summary = parseSummary(await askGemini(buildPrompt(c.label, c.region, found)));
    // 주소는 AI 답보다 네이버 지역 검색 결과가 정확하다.
    if (found.places[0]?.address) summary.address = found.places[0].address;
    const ok = Boolean(summary.oneLine || summary.menus || summary.priceMin);
    const sources = [
      ...found.places.slice(0, 1).filter((p) => p.link).map((p) => ({ title: `${p.name} (네이버 지역 검색)`, uri: p.link })),
      ...found.blogs.slice(0, 4).map((b) => ({ title: b.title, uri: b.link })),
    ];
    const update = {
      ai_status: ok ? "done" : "failed",
      ai_summary: ok ? summary : null,
      ai_sources: { sources, suggestions: null },
    };
    // 후보를 올린 사람이 가격을 안 적었으면 AI가 찾은 가격을 예산 계산에 쓴다. (최신이 아닐 수 있다는 안내는 화면에서)
    if (ok && !c.price_min && summary.priceMin) {
      update.price_min = summary.priceMin;
      update.price_max = summary.priceMax;
    }
    await db().from("candidates").update(update).eq("id", c.id);
  } catch (e) {
    console.error("AI 장소 요약 실패", c.label, e.message);
    await db().from("candidates").update({ ai_status: "failed" }).eq("id", c.id);
  }
}
