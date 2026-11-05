import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// 카카오로 연결한 모임장 로그인 상태. 쿠키에는 "카카오 회원번호.서명"을 넣어서, 쿠키를 고쳐 남의 번호로 바꿀 수 없게 한다.
// 서명 키(SESSION_SECRET)는 환경변수에만 둔다.
export const OWNER_COOKIE = "mp_owner";

const sign = (value) => createHmac("sha256", process.env.SESSION_SECRET || "").update(value).digest("base64url");

export function ownerCookieValue(kakaoId) {
  const id = String(kakaoId);
  return `${id}.${sign(id)}`;
}

export async function getOwnerId() {
  if (!process.env.SESSION_SECRET) return null;
  const raw = (await cookies()).get(OWNER_COOKIE)?.value || "";
  const [id, sig] = raw.split(".");
  if (!id || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(id));
  return a.length === b.length && timingSafeEqual(a, b) ? id : null;
}

export const kakaoLoginEnabled = () => Boolean(process.env.KAKAO_REST_API_KEY && process.env.SESSION_SECRET);

// 이 기기에 남은 모임 쿠키: 모임장(mpa_모임id = 모임장 비밀 키), 참여(mp_모임id = 이름 잠금 비밀 키)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function readMyCookies() {
  const all = (await cookies()).getAll();
  const pick = (prefix) =>
    all
      .filter((c) => c.name.startsWith(prefix) && UUID.test(c.name.slice(prefix.length)))
      .map((c) => ({ id: c.name.slice(prefix.length), token: c.value }));
  return { hosted: pick("mpa_"), joined: pick("mp_") };
}
