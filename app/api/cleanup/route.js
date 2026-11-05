import { deleteOldMeetings } from "@/lib/db";

// 매일 새벽 Vercel Cron이 부르는 주소 (vercel.json). 마감 90일이 지난 모임을 지운다.
// Vercel은 환경변수 CRON_SECRET을 "Authorization: Bearer …"로 붙여 보내므로, 그게 맞을 때만 실행한다.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("unauthorized", { status: 401 });
  }
  return Response.json(await deleteOldMeetings());
}
