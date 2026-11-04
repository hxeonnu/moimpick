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

export function priceRange(c) {
  if (c.price_min && c.price_max && c.price_max !== c.price_min) return `1인 ${won(c.price_min)} ~ ${won(c.price_max)}`;
  if (c.price_min) return `1인 ${won(c.price_min)}`;
  return "";
}

// 지도 링크가 없으면 가게 이름(+지역)으로 검색 링크를 만든다. 지도 API 키 없이 동작.
export function mapLinks(c) {
  const q = encodeURIComponent([c.region, c.label].filter(Boolean).join(" "));
  return {
    custom: c.map_url || null,
    kakao: `https://map.kakao.com/link/search/${q}`,
    naver: `https://map.naver.com/p/search/${q}`,
  };
}
