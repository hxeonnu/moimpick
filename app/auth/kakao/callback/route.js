import { cookies } from "next/headers";
import { linkMeetingsToOwner } from "@/lib/db";
import { OWNER_COOKIE, ownerCookieValue, kakaoLoginEnabled } from "@/lib/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 카카오 로그인에서 돌아온 곳. 인가 코드로 토큰을 받고, 카카오 회원번호만 꺼내 로그인 쿠키를 만든다.
// 그리고 이 기기에서 만든 모임(모임장 쿠키)을 이 카카오 계정에 연결한다.
export async function GET(request) {
  const url = new URL(request.url);
  const store = await cookies();
  let saved = {};
  try {
    saved = JSON.parse(store.get("mp_oauth")?.value || "{}");
  } catch {}
  store.delete("mp_oauth");
  const back = (path, reason) => {
    const to = new URL(path || "/", url);
    if (reason) to.searchParams.set("kakao", reason);
    return Response.redirect(to, 302);
  };

  const code = url.searchParams.get("code");
  if (!kakaoLoginEnabled() || !code || !saved.state || saved.state !== url.searchParams.get("state")) {
    return back(saved.next, "fail");
  }

  try {
    const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.KAKAO_REST_API_KEY,
        redirect_uri: `${url.origin}/auth/kakao/callback`,
        code,
        ...(process.env.KAKAO_CLIENT_SECRET ? { client_secret: process.env.KAKAO_CLIENT_SECRET } : {}),
      }),
    });
    const token = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(`token ${tokenRes.status} ${token.error_code || token.error || ""}`);

    const meRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const me = await meRes.json();
    if (!meRes.ok || !me.id) throw new Error(`user ${meRes.status}`);

    store.set(OWNER_COOKIE, ownerCookieValue(me.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 60,
      path: "/",
    });
    const mine = store
      .getAll()
      .filter((c) => c.name.startsWith("mpa_") && UUID.test(c.name.slice(4)))
      .map((c) => ({ id: c.name.slice(4), token: c.value }));
    await linkMeetingsToOwner(String(me.id), mine);
    return back(saved.next, "ok");
  } catch (e) {
    console.error("카카오 로그인 실패", e.message);
    return back(saved.next, "fail");
  }
}
