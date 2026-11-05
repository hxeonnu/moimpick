import Link from "next/link";
import { timeLeft } from "@/lib/format";

const STATUS = {
  todo: ["투표 전", "bg-amber-50 text-amber-700"],
  voted: ["투표함", "bg-emerald-50 text-emerald-700"],
  absent: ["불참", "bg-canvas text-sub"],
};

// 모임 목록의 한 줄 (첫 화면 "진행 중인 모임", "내가 만든 모임"이 같이 쓴다)
export default function MeetingRow({ m, now }) {
  const closed = new Date(m.deadline) <= now;
  const badges = [];
  if (m.host) badges.push(["👑 모임장", "bg-brand-soft text-brand-ink"]);
  if (m.me) badges.push(STATUS[m.me.status]);
  if (!badges.length) badges.push(closed ? ["마감", "bg-canvas text-sub"] : ["진행 중", "bg-brand-soft text-brand-ink"]);

  return (
    <li>
      <Link href={`/m/${m.id}`} className="flex items-center justify-between gap-3 py-2.5">
        <span className="min-w-0">
          <span className="block truncate font-semibold">{m.title}</span>
          <span className="text-xs text-sub">
            {m.round > 1 && `🔁 ${m.round}차 · `}
            {closed ? "마감됨 · 결과 보기" : `마감까지 ${timeLeft(m.deadline, now)} · 응답 ${m.responded}/${m.total}`}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          {badges.map(([text, cls]) => (
            <span key={text} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
              {text}
            </span>
          ))}
        </span>
      </Link>
    </li>
  );
}
