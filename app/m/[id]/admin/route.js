import { cookies } from "next/headers";
import { db } from "@/lib/db";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 모임장 링크(/m/모임/admin?t=비밀키)로 들어오면 이 기기를 모임장으로 기억하고 모임 화면으로 보낸다.
// 모임을 만든 기기는 자동으로 모임장이고, 다른 폰에서 관리할 때 이 링크를 쓴다.
export async function GET(request, { params }) {
  const { id } = await params;
  const token = request.nextUrl.searchParams.get("t") || "";
  const back = new URL(`/m/${id}`, request.url);
  if (!UUID.test(id) || !UUID.test(token)) return Response.redirect(back, 302);

  const { data } = await db().from("meetings").select("id").eq("id", id).eq("admin_token", token).maybeSingle();
  if (data) {
    (await cookies()).set(`mpa_${id}`, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 60,
      path: "/",
    });
  }
  return Response.redirect(back, 302);
}
