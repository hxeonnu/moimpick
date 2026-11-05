import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { kakaoLoginEnabled } from "@/lib/session";

// 카카오 로그인 시작. 카카오 로그인 화면으로 보내고, 돌아올 곳(next)과 위조 방지용 state를 쿠키에 잠깐 둔다.
export async function GET(request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") || "/";
  const back = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (!kakaoLoginEnabled()) return Response.redirect(new URL(back, url), 302);

  const state = randomBytes(16).toString("base64url");
  (await cookies()).set("mp_oauth", JSON.stringify({ state, next: back }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });

  const authorize = new URL("https://kauth.kakao.com/oauth/authorize");
  authorize.search = new URLSearchParams({
    client_id: process.env.KAKAO_REST_API_KEY,
    redirect_uri: `${url.origin}/auth/kakao/callback`,
    response_type: "code",
    state,
  });
  return Response.redirect(authorize, 302);
}
