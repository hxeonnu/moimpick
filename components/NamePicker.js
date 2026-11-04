"use client";

import { chooseParticipant } from "@/app/actions";

export default function NamePicker({ meetingId, participants }) {
  return (
    <section className="rounded-2xl bg-white p-4">
      <h2 className="font-bold">명단에서 내 이름을 골라 주세요</h2>
      <p className="mt-1 text-xs text-sub">고른 이름은 이 기기에 기억돼서, 다시 들어오면 내 응답을 고칠 수 있어요.</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {participants.map((p) => (
          <form key={p.id} action={chooseParticipant.bind(null, meetingId, p.id)}>
            <button className="w-full rounded-xl border border-line py-2.5 text-sm font-semibold hover:border-brand">
              {p.name}
              {p.voted_at && <span className="ml-1 text-xs text-sub">✓</span>}
            </button>
          </form>
        ))}
      </div>
    </section>
  );
}
