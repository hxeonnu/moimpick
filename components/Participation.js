"use client";

import { useCopy, ManualCopy } from "./useCopy";

// 투표율은 "응답(참석+불참) / 전체". 아직 응답 안 한 사람에게만 알림 문구를 보낸다.
export default function Participation({ meetingId, participants, closed }) {
  const { copy, copied, manual, close } = useCopy();
  const attending = participants.filter((p) => p.voted_at && !p.absent);
  const absent = participants.filter((p) => p.absent);
  const waiting = participants.filter((p) => !p.voted_at && !p.absent);
  const total = participants.length || 1;

  function remind() {
    const url = `${window.location.origin}/m/${meetingId}`;
    copy(`${waiting.map((p) => p.name).join(", ")} 투표 부탁해요! 👉 ${url}`);
  }

  return (
    <section className="rounded-2xl bg-white p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold">응답</h2>
        <p className="text-xl font-bold">
          {attending.length + absent.length}
          <span className="text-sm text-sub">/{participants.length}명</span>
        </p>
      </div>
      <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-canvas">
        <div className="h-2 bg-brand" style={{ width: `${(attending.length / total) * 100}%` }} />
        <div className="h-2 bg-sub/40" style={{ width: `${(absent.length / total) * 100}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-sub">
        참석 {attending.length} · 불참 {absent.length} · 무응답 {waiting.length}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {attending.map((p) => (
          <span key={p.id} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            {p.name}
          </span>
        ))}
        {absent.map((p) => (
          <span key={p.id} className="rounded-full bg-canvas px-2.5 py-1 text-xs text-sub line-through">
            {p.name}
          </span>
        ))}
        {waiting.map((p) => (
          <span key={p.id} className="rounded-full border border-dashed border-line px-2.5 py-1 text-xs text-sub">
            {p.name}
          </span>
        ))}
      </div>
      {!closed && waiting.length > 0 && (
        <button onClick={remind} className="mt-3 w-full rounded-lg border border-line py-2 text-sm font-semibold text-brand-ink">
          {copied ? "복사됨" : "📋 아직 응답 안 한 사람에게 알림 문구 복사"}
        </button>
      )}
      <ManualCopy text={manual} onClose={close} />
    </section>
  );
}
