"use client";

import { useCopy, ManualCopy } from "./useCopy";

export default function Participation({ meetingId, participants, closed }) {
  const { copy, copied, manual, close } = useCopy();
  const done = participants.filter((p) => p.voted_at);
  const waiting = participants.filter((p) => !p.voted_at);
  const rate = participants.length ? Math.round((done.length / participants.length) * 100) : 0;

  function remind() {
    const url = `${window.location.origin}/m/${meetingId}`;
    copy(`${waiting.map((p) => p.name).join(", ")} 투표 부탁해요! 👉 ${url}`);
  }

  return (
    <section className="rounded-2xl bg-white p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold">투표율</h2>
        <p className="text-xl font-bold">
          {done.length}
          <span className="text-sm text-sub">/{participants.length}명</span>
        </p>
      </div>
      <div className="mt-2 h-2 rounded-full bg-canvas">
        <div className="h-2 rounded-full bg-brand" style={{ width: `${rate}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {done.map((p) => (
          <span key={p.id} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
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
          {copied ? "복사됨" : "📋 안 한 사람에게 알림 문구 복사"}
        </button>
      )}
      <ManualCopy text={manual} onClose={close} />
    </section>
  );
}
