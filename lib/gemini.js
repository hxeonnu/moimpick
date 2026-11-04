import "server-only";
import { db } from "./db";
import { parseSummary } from "./aiParse";

// AI 장소 요약: 장소 후보가 추가되면 한 번만 Gemini + 구글 검색으로 요약을 만들어 저장한다.
// 무료 사용량 안에서만 쓰고, 키는 환경변수(GEMINI_API_KEY)에만 둔다.

function buildPrompt(name, region) {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  return `오늘 날짜: ${today}
아래 장소를 검색해서, 정해진 항목만 한 줄씩 답해 줘.
장소: ${name}${region ? ` (${region})` : ""}

종류: 국밥/고기/카페/술집/기타 중 하나
지점확인: "확인됨" 또는 "지점 확인 필요"
한줄요약: 30자 이내
주소:
대표메뉴: 최대 3개, 쉼표로 구분
가격범위: 최소~최대, 숫자만 (예: 9000~12000)
가격기준: 25자 이내 (예: 단품 국밥~수육백반 1인 / 2인 4인분 주문, 1인 2인분 기준)
가격시점: 출처에 적힌 시점 (예: 2025-12), 모르면 "정보 없음"
영업시간: HH:MM~HH:MM, 요일마다 다르면 "월~금 11:00~22:00, 토 12:00~21:00"처럼
브레이크타임: HH:MM~HH:MM, 없으면 "없음"
휴무일: 요일(예: 월), 없으면 "연중무휴"
후기요약: 2문장 이내

규칙:
1. 출처에서 확인한 내용만 쓰고, 모르면 "정보 없음"이라고 써.
2. 평점이나 숫자를 추측해서 만들지 마.
3. 가격은 오늘 날짜에 가까운 최신 정보를 우선하고, 그 정보의 시점을 가격시점에 써.
4. 가격은 대표 메뉴를 1인이 한 끼 먹을 때 내는 금액이야.
   - 여럿이 나눠 먹는 메뉴는 1인 금액으로 나눠서 써.
   - 고깃집처럼 인분·g 단위면 보통 몇 인분을 시키는지 기준으로 1인 금액을 계산하고, 그 기준을 가격기준에 써.
   - 사이드 메뉴, 주류, 추가 사리는 빼.
5. 같은 이름의 다른 지점 정보가 섞여 있으면 지점확인에 "지점 확인 필요"라고 써.
6. 항목 이름을 바꾸거나, 위에 없는 설명·안내 문장을 덧붙이지 마.`;
}

async function askGemini(prompt) {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  // 요약은 깊게 생각할 일이 아니라서 thinking을 최소로 둔다.
  const thinkingConfig = model.startsWith("gemini-2") ? { thinkingBudget: 0 } : { thinkingLevel: "low" };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { thinkingConfig },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const cand = json.candidates?.[0];
  const text = (cand?.content?.parts || []).map((p) => p.text || "").join("\n");
  const meta = cand?.groundingMetadata || {};
  const sources = (meta.groundingChunks || [])
    .map((c) => c.web)
    .filter(Boolean)
    .map((w) => ({ title: w.title || w.uri, uri: w.uri }));
  return { text, sources, suggestions: meta.searchEntryPoint?.renderedContent || null };
}

export async function summarizePlace(candidateId) {
  const { data: c } = await db().from("candidates").select("*").eq("id", candidateId).maybeSingle();
  if (!c || c.kind !== "place") return;
  if (!process.env.GEMINI_API_KEY) {
    await db().from("candidates").update({ ai_status: "none" }).eq("id", c.id);
    return;
  }

  try {
    const { text, sources, suggestions } = await askGemini(buildPrompt(c.label, c.region));
    const summary = parseSummary(text);
    const ok = Boolean(summary.oneLine || summary.menus || summary.priceMin);
    const update = {
      ai_status: ok ? "done" : "failed",
      ai_summary: ok ? summary : null,
      ai_sources: { sources: sources.slice(0, 5), suggestions },
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
