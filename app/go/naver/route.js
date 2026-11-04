// 네이버 지도 검색으로 보낸다.
// PC 주소(map.naver.com/p/search/검색어)를 휴대폰에서 열면 검색어가 빠진 첫 화면(menu=location)으로 넘어가서
// 검색이 안 된다. 그래서 휴대폰이면 모바일 검색 주소(m.map.naver.com/search?query=검색어)로 보낸다.
export function GET(request) {
  const q = (request.nextUrl.searchParams.get("q") || "").slice(0, 100);
  const mobile = /Mobi|Android|iPhone|iPad/i.test(request.headers.get("user-agent") || "");
  const url = mobile
    ? `https://m.map.naver.com/search?query=${encodeURIComponent(q)}`
    : `https://map.naver.com/p/search/${encodeURIComponent(q)}`;
  return Response.redirect(url, 302);
}
