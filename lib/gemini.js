import "server-only";
import { db } from "./db";
import { parseSummary } from "./aiParse";

// AI 장소 요약: 장소 후보가 추가되면 한 번만 요약을 만들어 저장한다.
// 무료 Gemini API에서는 구글 검색(Grounding)을 쓸 수 없고, 네이버 검색 API는 신규 신청이 막혀서,
// 카카오 검색 API로 가게(장소 검색)와 후기(블로그 검색)를 찾고 Gemini에게는 그 내용만 근거로 요약을 시킨다.
// 키는 모두 환경변수에만 둔다. 카카오는 하루 무료 한도를 넘으면 요청이 막힐 뿐 돈이 나가지 않는다.

export const aiEnabled = () => Boolean(process.env.GEMINI_API_KEY && process.env.KAKAO_REST_API_KEY);

const stripTags = (s = "") =>
  s.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").trim();

async function kakao(path, params) {
  const res = await fetch(`https://dapi.kakao.com${path}?${new URLSearchParams(params)}`, {
    headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` },
  });
  if (!res.ok) throw new Error(`Kakao ${path} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).documents || [];
}

// 카카오 업종(예: "가정,생활 > 여가시설 > 보드카페")으로 장소 종류를 정한다.
// AI에게 맡기면 보드게임카페를 "카페"로 넣는 식으로 흔들려서, 카카오 분류가 있으면 그걸 쓴다.
export const TYPES = ["식당", "카페", "술집", "놀거리", "기타"];
export function placeType(category) {
  if (!category) return null;
  const parts = category.split(" > ");
  const detail = parts[2] || parts[1] || null;
  if (/^음식점 > 술집/.test(category)) return { type: "술집", detail };
  if (/^음식점 > 카페/.test(category)) return { type: "카페", detail };
  if (/^음식점/.test(category)) return { type: "식당", detail };
  if (/여가시설|스포츠,레저|문화,예술|여행/.test(category)) return { type: "놀거리", detail };
  return { type: "기타", detail };
}

// 카카오에서 장소(장소 검색)와 후기(블로그 검색)를 찾는다.
export async function searchPlace(name, region) {
  const local = (query) => kakao("/v2/local/search/keyword.json", { query, size: "5" });
  // "부산 남구 평화김해뒷고기 경성대점"처럼 지역을 붙이면 오히려 못 찾을 때가 있어서, 없으면 이름만으로 다시 찾는다.
  let places = await local([region, name].filter(Boolean).join(" "));
  if (!places.length && region) {
    const head = region.split(/\s+/)[0];
    places = (await local(name)).sort((a, b) => b.address_name.includes(head) - a.address_name.includes(head));
  }
  const kind = placeType(places[0]?.category_name);
  // 블로그는 카카오에 등록된 정확한 이름(예: 경성대부경대점)으로 찾아야 다른 곳 후기가 덜 섞인다.
  // 가격과 영업시간으로 두 번 찾는다. 한 번만 찾으면 영업시간이 적힌 후기가 잘 안 걸린다.
  // 놀거리는 "메뉴"보다 "요금"으로 찾아야 가격이 적힌 후기가 걸린다.
  const query = places[0]?.place_name || [region, name].filter(Boolean).join(" ");
  const [priceBlogs, hourBlogs] = await Promise.all([
    kakao("/v2/search/blog", { query: `${query} ${kind?.type === "놀거리" ? "요금" : "메뉴 가격"}`, size: "8", sort: "accuracy" }),
    kakao("/v2/search/blog", { query: `${query} 영업시간`, size: "6", sort: "accuracy" }),
  ]);
  const seen = new Set();
  const blogs = [...priceBlogs, ...hourBlogs].filter((b) => !seen.has(b.url) && seen.add(b.url));
  return {
    kind,
    places: places.map((p) => ({
      name: p.place_name,
      category: p.category_name,
      address: p.road_address_name || p.address_name,
      link: p.place_url,
    })),
    blogs: blogs.map((b) => ({
      title: stripTags(b.title),
      text: stripTags(b.contents),
      date: (b.datetime || "").slice(0, 7),
      link: b.url,
    })),
  };
}

// 종류마다 가격을 매기는 단위가 달라서, 그 종류의 규칙만 프롬프트에 넣는다. (종류를 모르면 전부)
const PRICE_RULES = {
  식당: [
    `국밥·면·덮밥처럼 한 그릇 단위면 단품 가격을 쓰고, 가격기준은 "단품 기준".`,
    `고깃집처럼 인분 단위면 대표 고기의 1인분 가격을 쓰고, 가격기준은 "1인분 기준". (예: 삼겹살 1인분 15,000원, 목살 1인분 16,000원이면 15000~16000)`,
    `사이드, 주류, 추가 사리, 세트, 여럿이 나눠 먹는 대(大)자 메뉴는 빼.`,
  ],
  카페: [`대표 음료·디저트 하나의 가격을 쓰고, 가격기준은 "단품 기준".`],
  술집: [`대표 안주 한 접시 가격을 쓰고, 가격기준은 "안주 기준". 술값은 빼.`],
  놀거리: [
    `대표메뉴에는 음식 대신 대표 요금제나 즐길 거리를 써. (예: 평일 1시간, 무제한, 1게임)`,
    `가격은 이용 요금을 그대로 쓰고, 요금 단위를 가격기준에 써. (예: 보드게임카페·만화카페·PC방 "1인 1시간 기준", 볼링 "1인 1게임 기준", 방탈출·체험·입장료 "1인 이용료", 노래방 "방 1시간 기준")`,
    `요금 단위가 섞여 있으면(곡당·30분·1시간) 1시간 요금 하나만 써. 가격기준에도 단위는 하나만.`,
    `안에서 파는 음료·음식 값은 빼. 무료로 이용할 수 있으면 가격범위에 "무료"라고 쓰고, 대표메뉴에는 즐길 거리를 써. (예: 해안산책로)`,
  ],
};

function buildPrompt(name, region, found) {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const places = found.places.map((p, i) => `(${i + 1}) ${p.name} | ${p.category} | ${p.address}`).join("\n") || "없음";
  const blogs = found.blogs.map((b, i) => `[${i + 1}] (${b.date}) ${b.title} - ${b.text}`).join("\n") || "없음";
  const type = found.kind?.type;
  const rules = (PRICE_RULES[type] || Object.values(PRICE_RULES).flat()).map((r) => `   - ${r}`).join("\n");
  return `오늘 날짜: ${today}
아래 "검색 결과"만 근거로, 정해진 항목만 한 줄씩 답해 줘.
장소: ${name}${region ? ` (${region})` : ""}${type ? `\n장소 종류: ${type}${found.kind.detail ? ` (${found.kind.detail})` : ""}` : ""}

[카카오 장소 검색 결과]
${places}

[블로그 후기 일부]
${blogs}

종류: ${TYPES.join("/")} 중 하나${type ? ` (위의 장소 종류를 그대로)` : ""}
지점확인: "확인됨" 또는 "지점 확인 필요"
한줄요약: 30자 이내, 영업시간·가격 같은 숫자는 넣지 마
주소:
대표메뉴: 최대 3개, 쉼표로 구분
가격범위: 대표메뉴 가격의 최소~최대, 숫자만 (예: 9000~12000)
가격기준: 20자 이내 (아래 규칙 4)
가격시점: 가격이 나온 후기의 날짜 (예: 2025-12), 모르면 "정보 없음"
영업시간: HH:MM~HH:MM, 요일마다 다르면 "월~금 11:00~22:00, 토 12:00~21:00"처럼
브레이크타임: HH:MM~HH:MM, 없으면 "없음"
휴무일: 요일(예: 월), 없으면 "연중무휴"
후기요약: 2문장 이내

규칙:
1. 검색 결과에 나온 내용만 쓰고, 없으면 "정보 없음"이라고 써. 네가 원래 알던 내용은 쓰지 마.
2. 평점이나 숫자를 추측해서 만들지 마.
3. 가격과 영업시간은 오늘 날짜에 가까운 최신 후기를 우선하고, 가격이 나온 후기의 날짜를 가격시점에 써.
4. 가격은 메뉴판·요금표 가격을 그대로 써. 1인 예상 금액을 계산하거나, 나누거나 곱하지 마.
${rules}
   - 대표메뉴에 쓴 것의 가격만 쓰고, 범위는 좁게. 최대가 최소의 1.5배를 넘으면 가장 많이 고르는 쪽으로 좁혀.
5. 지역 검색 결과에 같은 이름의 다른 지점이 섞여 있거나, 후기가 다른 지점 이야기면 지점확인에 "지점 확인 필요"라고 써.
6. 검색 결과에 이 장소가 없으면 모든 항목에 "정보 없음"이라고 써.
7. 항목 이름을 바꾸거나, 위에 없는 설명·안내 문장을 덧붙이지 마.`;
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
    // 주소와 종류는 AI 답보다 카카오 장소 검색 결과가 정확하다.
    if (found.places[0]?.address) summary.address = found.places[0].address;
    if (found.kind) Object.assign(summary, { kind: found.kind.type, kindDetail: found.kind.detail });
    else if (!TYPES.includes(summary.kind)) summary.kind = null;
    const ok = Boolean(summary.oneLine || summary.menus || summary.priceMin || summary.free);
    const sources = [
      ...found.places.slice(0, 1).filter((p) => p.link).map((p) => ({ title: `${p.name} (카카오맵)`, uri: p.link })),
      ...found.blogs.slice(0, 4).map((b) => ({ title: b.title, uri: b.link })),
    ];
    const update = {
      ai_status: ok ? "done" : "failed",
      ai_summary: ok ? summary : null,
      ai_sources: { sources, suggestions: null },
    };
    // 후보를 올린 사람이 가격을 안 적었으면 AI가 찾은 가격을 예산 계산에 쓴다. (최신이 아닐 수 있다는 안내는 화면에서)
    if (!c.map_url && found.places[0]?.link) update.map_url = found.places[0].link;
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
