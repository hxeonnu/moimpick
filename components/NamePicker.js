"use client";

import { useActionState, useState, useTransition } from "react";
import { chooseParticipant, unlockParticipant } from "@/app/actions";
import { useCopy, ManualCopy } from "./useCopy";

// 이름은 선착순으로 잠긴다. 처음 고른 기기만 그 이름으로 투표하고, 다른 기기는 번호 3자리로 들어온다.
export default function NamePicker({ meetingId, title, participants }) {
  const [picked, setPicked] = useState(null);
  const [error, setError] = useState(null);
  const [pending, start] = useTransition();

  function pick(p) {
    setError(null);
    setPicked(p);
  }

  function choose() {
    start(async () => {
      // 성공하면 서버가 투표 화면으로 넘긴다. 그사이 다른 사람이 먼저 골랐으면 번호 입력으로 바꾼다.
      const res = await chooseParticipant(meetingId, picked.id);
      if (res?.locked) setPicked({ ...picked, claimed: true });
      else if (res?.error) setError(res.error);
    });
  }

  return (
    <section className="rounded-2xl bg-white p-4">
      <h2 className="font-bold">명단에서 내 이름을 골라 주세요</h2>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {participants.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => pick(p)}
            className={`rounded-xl border py-2.5 text-sm font-semibold ${
              picked?.id === p.id ? "border-brand bg-brand-soft text-brand-ink" : "border-line"
            } ${p.claimed ? "text-sub" : ""}`}
          >
            {p.name}
            {p.claimed && <span className="ml-1 text-xs">🔒</span>}
          </button>
        ))}
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-xs font-semibold text-red-600">
        <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-600 text-[11px] font-bold text-white">
          !
        </span>
        이름을 고르면 다시 바꿀 수 없어요. 꼭 내 이름인지 확인하고 골라 주세요.
      </p>

      {picked && !picked.claimed && (
        <div className="mt-3 rounded-xl bg-canvas p-3 text-sm">
          <p>
            <strong>{picked.name}</strong>(으)로 투표할까요?
          </p>
          <button
            type="button"
            onClick={choose}
            disabled={pending}
            className="mt-2 w-full rounded-lg bg-brand py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {pending ? "확인하는 중…" : `${picked.name}(으)로 시작하기`}
          </button>
          {error && <p className="mt-2 text-red-600">{error}</p>}
        </div>
      )}

      {picked?.claimed && <PinForm key={picked.id} meetingId={meetingId} title={title} person={picked} />}
    </section>
  );
}

function PinForm({ meetingId, title, person }) {
  const [state, action, pending] = useActionState(unlockParticipant.bind(null, meetingId, person.id), null);
  const { copy, copied, manual, close } = useCopy();

  function askHost() {
    copy(`모임픽 "${title}"에서 내 이름(${person.name}) 잠금 좀 풀어 줘! 👉 ${window.location.origin}/m/${meetingId}`);
  }

  return (
    <div className="mt-3 rounded-xl bg-canvas p-3 text-sm">
      <p>
        <strong>{person.name}</strong>은(는) 이미 누가 고른 이름이에요 🔒
      </p>
      <p className="mt-0.5 text-xs text-sub">내 이름이면, 처음 고를 때 받은 번호 3자리를 입력해 주세요.</p>
      <form action={action} className="mt-2 flex gap-2">
        <input
          name="pin"
          inputMode="numeric"
          autoComplete="off"
          maxLength={3}
          pattern="[0-9]{3}"
          required
          autoFocus
          placeholder="000"
          className="w-24 rounded-lg border border-line bg-white px-3 py-2 text-center text-lg tracking-[0.3em] outline-none focus:border-brand"
        />
        <button disabled={pending} className="flex-1 rounded-lg bg-brand py-2 font-semibold text-white disabled:opacity-60">
          {pending ? "확인하는 중…" : "확인"}
        </button>
      </form>
      {state?.error && <p className="mt-2 text-red-600">{state.error}</p>}
      <p className="mt-3 text-xs text-sub">
        번호를 모르거나, 내 이름인데 다른 사람이 먼저 골랐다면 모임장에게 잠금 풀기를 부탁해 주세요.
      </p>
      <button type="button" onClick={askHost} className="mt-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold">
        {copied ? "복사됨" : "모임장에게 보낼 문구 복사"}
      </button>
      <ManualCopy text={manual} onClose={close} />
    </div>
  );
}
