import Link from "next/link";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { loadMeetingSummaries } from "@/lib/db";
import { timeLeft } from "@/lib/format";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 첫 화면의 "내가 만든 모임". 가입 없이, 이 기기에 남은 모임장 쿠키(mpa_모임id)로 찾는다.
// 쿠키가 지워지면 목록도 사라지므로, 모임장 링크를 보관하거나 카카오로 연결해 두도록 안내한다.
export default async function MyMeetings() {
  await connection();
  const store = await cookies();
  const mine = store
    .getAll()
    .filter((c) => c.name.startsWith("mpa_") && UUID.test(c.name.slice(4)))
    .map((c) => ({ id: c.name.slice(4), token: c.value }));
  const meetings = await loadMeetingSummaries(mine);
  if (!meetings.length) return null;

  const now = new Date();
  return (
    <section className="mb-5 rounded-2xl bg-white p-4">
      <h2 className="text-sm font-bold">👑 내가 만든 모임</h2>
      <ul className="mt-2 divide-y divide-line">
        {meetings.map((m) => {
          const closed = new Date(m.deadline) <= now;
          return (
            <li key={m.id}>
              <Link href={`/m/${m.id}`} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{m.title}</span>
                  <span className="text-xs text-sub">
                    {m.round > 1 && `🔁 ${m.round}차 · `}
                    {closed ? "마감됨 · 결과 보기" : `마감까지 ${timeLeft(m.deadline, now)} · 응답 ${m.responded}/${m.total}`}
                  </span>
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${closed ? "bg-canvas text-sub" : "bg-brand-soft text-brand-ink"}`}>
                  {closed ? "마감" : "진행 중"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] text-sub">이 기기에서 만든 모임이에요. 다른 기기에서는 모임장 링크로 들어가면 여기에도 보여요.</p>
    </section>
  );
}
