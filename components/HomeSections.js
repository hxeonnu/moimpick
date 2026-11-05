import Link from "next/link";
import { connection } from "next/server";
import { loadMeetingSummaries, loadJoinedMeetings } from "@/lib/db";
import { getOwnerId, readMyCookies } from "@/lib/session";
import MeetingRow from "./MeetingRow";

// 첫 화면: ① 진행 중인 모임(내가 만들었거나 참여 중) ② 내가 만든 모임 상자 ③ 새 모임 만들기
// 가입이 없으므로 이 기기에 남은 모임장·참여 쿠키와, 카카오로 연결한 모임으로 찾는다.
export default async function HomeSections() {
  await connection();
  const { hosted, joined } = await readMyCookies();
  const ownerId = await getOwnerId();
  const [mine, joinedList] = await Promise.all([loadMeetingSummaries(hosted, ownerId), loadJoinedMeetings(joined)]);
  const now = new Date();
  const open = (m) => new Date(m.deadline) > now;

  // 모임장이면서 참여도 한 모임은 한 줄로 합친다.
  const ongoing = new Map();
  for (const m of mine.filter(open)) ongoing.set(m.id, { ...m, host: true });
  for (const m of joinedList.filter(open)) ongoing.set(m.id, { ...m, ...ongoing.get(m.id), me: m.me });
  const list = [...ongoing.values()].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  const mineOpen = mine.filter(open).length;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-4">
        <h2 className="text-sm font-bold">🗳 진행 중인 모임</h2>
        {list.length ? (
          <ul className="mt-1 divide-y divide-line">
            {list.map((m) => (
              <MeetingRow key={m.id} m={m} now={now} />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-sub">진행 중인 모임이 없어요. 단톡방에 올라온 링크로 들어가거나 새 모임을 만들어 보세요.</p>
        )}
      </section>

      <Link href="/mine" className="flex items-center justify-between rounded-2xl bg-white p-4">
        <span>
          <span className="flex items-center gap-1.5 font-bold">
            👑 내가 만든 모임
            {ownerId && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">✅ 카카오에 연결됨</span>
            )}
          </span>
          <span className="text-xs text-sub">
            {mine.length ? `진행 중 ${mineOpen} · 마감 ${mine.length - mineOpen}` : "아직 만든 모임이 없어요"}
          </span>
        </span>
        <span className="text-xl text-sub">›</span>
      </Link>

      <Link href="/new" className="flex items-center justify-between rounded-2xl bg-brand p-4 text-white">
        <span>
          <span className="block font-bold">＋ 새 모임 만들기</span>
          <span className="text-xs text-white/80">날짜·장소 후보를 정하고 링크를 받아요</span>
        </span>
        <span className="text-xl">›</span>
      </Link>
    </div>
  );
}
