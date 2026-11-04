import "server-only";

// 지도 링크에서 가게 이름과 주소를 알아낸다.
// 링크 미리보기용으로 공개된 정보(og:title, og:description)만 읽는다. 영업시간·메뉴 같은 페이지 내용은 읽지 않는다.

// 카카오맵·네이버 지도 주소만 따라간다. (아무 주소나 서버가 열지 않도록)
const ALLOWED = [/(^|\.)kakao\.com$/, /^kko\.to$/, /^naver\.me$/, /(^|\.)naver\.com$/];
const allowed = (url) => {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? ALLOWED.some((re) => re.test(u.hostname)) : false;
  } catch {
    return false;
  }
};

export const looksLikeUrl = (text) => /^https?:\/\/\S+$/i.test(String(text || "").trim());

const decode = (s = "") =>
  s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

function meta(html, name) {
  const a = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)`, "i"));
  const b = html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${name}["']`, "i"));
  return decode((a || b)?.[1] || "");
}

// "금수돼지국밥 경성부경대점 | 카카오맵", "○○ : 네이버" 같은 뒤꼬리를 뗀다.
const cleanTitle = (t) => t.replace(/\s*[|:\-–]\s*(카카오맵|kakaomap|네이버(\s*지도)?|naver(\s*map)?|네이버 플레이스).*$/i, "").trim();

export async function resolvePlaceLink(rawUrl) {
  let url = String(rawUrl).trim();
  if (!allowed(url)) return null;

  // 짧은 공유 링크(kko.to, naver.me)는 몇 번 넘어가서 실제 가게 페이지로 간다.
  let html = "";
  for (let hop = 0; hop < 5; hop++) {
    const res = await fetch(url, {
      redirect: "manual",
      headers: { "user-agent": "Mozilla/5.0 (compatible; moimpick-link-preview)" },
      signal: AbortSignal.timeout(6000),
    });
    const next = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && next) {
      url = new URL(next, url).toString();
      if (!allowed(url)) return null;
      continue;
    }
    if (!res.ok) return null;
    html = await res.text();
    break;
  }
  if (!html) return null;

  const name = cleanTitle(meta(html, "og:title") || html.match(/<title>([^<]*)/i)?.[1] || "");
  const description = meta(html, "og:description");
  if (!name || /^(카카오맵|네이버(\s*지도)?|naver map)$/i.test(name)) return null;
  // 설명에 주소가 들어 있으면 지역으로 쓴다. (예: "부산 남구 수영로346번길 12 1층")
  const address = /(시|도|구|군)\s/.test(description) ? description : "";
  return { name, address, url };
}

// 주소에서 "부산 남구"처럼 앞의 두 단어만 지역으로 쓴다.
export const regionFromAddress = (address) => (address ? address.split(/\s+/).slice(0, 2).join(" ") : null);
