// 시간은 모두 한국 시간 기준으로 보여 준다.
const KST = "Asia/Seoul";

export function formatDeadline(iso) {
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: KST,
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function timeLeft(iso, now) {
  const ms = new Date(iso) - now;
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}일 ${h % 24}시간`;
  return h ? `${h}시간 ${m}분` : `${m}분`;
}

export function won(n) {
  return n == null ? "" : `${n.toLocaleString("ko-KR")}원`;
}

// 사람이 적은 가격은 1인 가격, AI가 찾은 가격은 메뉴판·요금표 가격이다. (단위는 가격기준에: 단품, 1인분, 1인 1시간 등)
export const priceFromAi = (c) => Boolean(c.price_min && c.ai_summary?.priceMin === c.price_min);

export function priceRange(c) {
  if (!c.price_min) return "";
  const range = c.price_max && c.price_max !== c.price_min ? `${won(c.price_min)} ~ ${won(c.price_max)}` : won(c.price_min);
  return priceFromAi(c) ? range : `1인 ${range}`;
}

// 카카오맵 버튼은 카카오 장소 페이지(직접 붙인 링크나 AI가 찾은 링크)가 있으면 그 페이지로, 없으면 이름으로 검색한다.
// 네이버 버튼은 네이버 지도 링크로 추가했으면 그 링크로, 없으면 이름으로 검색한다. 지도 API 키 없이 동작.
const hostOf = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
};

export function mapLinks(c) {
  const host = hostOf(c.map_url);
  const isKakao = /(^|\.)kakao\.com$|^kko\.to$/.test(host);
  const isNaver = /(^|\.)naver\.(com|me)$/.test(host);
  const q = encodeURIComponent([c.region, c.label].filter(Boolean).join(" "));
  return {
    kakao: isKakao ? c.map_url : `https://map.kakao.com/link/search/${q}`,
    // 휴대폰과 PC의 네이버 검색 주소가 달라서 /go/naver가 기기를 보고 넘겨 준다.
    naver: isNaver ? c.map_url : `/go/naver?q=${q}`,
  };
}
