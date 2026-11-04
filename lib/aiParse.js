// Gemini 답을 항목별 값으로 나눈다. DB를 부르지 않는 순수 함수라 따로 시험해 볼 수 있다.

const FIELDS = {
  종류: "kind",
  지점확인: "branchCheck",
  한줄요약: "oneLine",
  주소: "address",
  대표메뉴: "menus",
  가격범위: "priceRange",
  가격기준: "priceBasis",
  가격시점: "priceAsOf",
  영업시간: "hours",
  브레이크타임: "breakTime",
  휴무일: "closedDays",
  후기요약: "review",
};

// "가격범위: 9,500 ~ 13,000원" 같은 줄을 항목별 값으로 나눈다. 정해진 항목만 읽고 나머지 줄은 버린다.
export function parseSummary(text) {
  const out = {};
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\[\d+(?:,\s*\d+)*\]/g, "").replace(/^[\s*\-•]+/, "").trim();
    const m = line.match(/^([가-힣]+)\s*[:：]\s*(.*)$/);
    if (!m || !FIELDS[m[1]]) continue;
    const value = m[2].trim();
    out[FIELDS[m[1]]] = !value || value.startsWith("정보 없음") ? null : value;
  }
  if (out.menus) out.menus = out.menus.split(/[,，·]/).map((s) => s.trim()).filter(Boolean).slice(0, 3);
  if (out.priceRange) {
    const nums = (out.priceRange.match(/\d[\d,]*/g) || []).map((n) => parseInt(n.replace(/,/g, ""), 10)).filter((n) => n >= 100);
    out.priceMin = nums[0] ?? null;
    out.priceMax = nums[1] ?? nums[0] ?? null;
    // 범위가 너무 넓으면(1.5배 초과) 대표 가격을 알기 어려워서 최소 가격 하나만 쓴다.
    if (out.priceMin && out.priceMax > out.priceMin * 1.5) out.priceMax = out.priceMin;
    // 공원처럼 돈이 안 드는 곳은 "무료"로 표시한다.
    out.free = !nums.length && out.priceRange.includes("무료");
  }
  out.branchUnsure = Boolean(out.branchCheck && out.branchCheck.includes("필요"));
  return out;
}

