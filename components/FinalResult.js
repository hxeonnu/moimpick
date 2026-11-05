import { decide, dateKey, placeKey } from "@/lib/ranking";
import { parseDateLabel } from "@/lib/format";
import { PickTie, ResultShare, Revote } from "./ResultShare";

// 마감 후 확정 결과와 공지.
// 1위가 동점이면 모임장이 ① 하나를 골라 확정하거나 ② 동점 그대로 공지하거나 ③ 동점 항목으로만 재투표를 연다.
export default function FinalResult({ meeting, dateRanks, placeRanks, count, isAdmin }) {
  const { mode } = meeting;
  if (!count.attending) {
    return (
      <section className="rounded-2xl bg-brand-soft p-5 text-center">
        <p className="text-sm font-semibold text-brand-ink">투표가 마감됐어요.</p>
        <p className="mt-2 text-sm text-sub">참석으로 투표한 사람이 없어서 약속을 정하지 못했어요.</p>
      </section>
    );
  }

  const date = mode !== "place" ? decide(dateRanks, dateKey, meeting.final_date_id) : null;
  const place = mode !== "date" ? decide(placeRanks, placeKey, meeting.final_place_id) : null;
  const ready = [date, place].every((d) => !d || d.none || d.winner);
  // 원래 동점이었는지 (모임장이 하나를 골랐어도 재투표는 열 수 있게)
  const hadTie = [date, place].some((d) => d && !d.none && d.tied.length > 1);

  const row = (icon, d, empty) => {
    if (!d) return null;
    if (d.none) return <p className="text-sm text-sub">{empty}</p>;
    if (d.winner) {
      return (
        <div>
          <p className="text-lg font-bold">
            {icon} {d.winner.candidate.label}
          </p>
          {d.picked && <p className="text-xs text-sub">동점 중 모임장이 골랐어요</p>}
          {isAdmin && d.tied.length > 1 && <PickTie meetingId={meeting.id} tied={d.tied} current={d.winner.candidate.id} />}
        </div>
      );
    }
    return (
      <div>
        <p className="text-sm">
          <strong>{d.tied.map((t) => t.candidate.label).join(" / ")}</strong> 동점이에요.
        </p>
        {isAdmin ? (
          <PickTie meetingId={meeting.id} tied={d.tied} />
        ) : (
          <p className="text-xs text-sub">모임장이 하나를 고르거나, 동점 항목으로 재투표를 열 수 있어요.</p>
        )}
      </div>
    );
  };

  // 공지 문구 (링크는 화면에서 붙인다). 동점이면 동점 그대로 적는다.
  const placeLabel = (c) => `${c.label}${c.ai_summary?.address ? ` (${c.ai_summary.address})` : ""}`;
  const line = (icon, d, label) =>
    !d || d.none ? null : d.winner ? `${icon} ${label(d.winner.candidate)}` : `${icon} ${d.tied.map((t) => t.candidate.label).join(" / ")} (동점)`;
  const lines = [
    `[모임픽] ${meeting.title} ${ready ? "약속이 정해졌어요!" : "투표 결과예요"}`,
    line("📅", date, (c) => c.label),
    line("📍", place, placeLabel),
    `참석 ${count.attending}명이 정한 결과예요.`,
  ].filter(Boolean);
  const canCalendar = Boolean(date?.winner && parseDateLabel(date.winner.candidate.label, meeting.created_at));

  return (
    <section className="rounded-2xl bg-brand-soft p-5 text-center">
      <p className="text-sm font-semibold text-brand-ink">
        {meeting.round > 1 ? `${meeting.round}차 투표가` : "투표가"} 마감됐어요. {ready ? "약속이 정해졌어요!" : "1위가 동점이에요."}
      </p>
      <div className="mt-3 space-y-2">
        {row("📅", date, "날짜 후보가 없었어요.")}
        {row("📍", place, "장소 후보가 없었어요.")}
      </div>
      <p className="mt-3 text-xs text-sub">
        참석 {count.attending}명이 정한 결과예요 · 불참 {count.absent} · 무응답 {count.noResponse}
      </p>
      {hadTie && isAdmin && <Revote meetingId={meeting.id} />}
      <ResultShare meetingId={meeting.id} lines={lines} canCalendar={canCalendar} isAdmin={isAdmin} tie={!ready} />
    </section>
  );
}
