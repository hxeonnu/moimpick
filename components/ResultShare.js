"use client";

import { useActionState, useState, useTransition } from "react";
import { pickFinal, revote } from "@/app/actions";
import ShareActions from "./ShareActions";

// 확정 결과 공지: 카카오톡 공유 크게, 결과 문구 복사·다른 앱·캘린더 작게
export function ResultShare({ meetingId, lines, canCalendar, isAdmin, tie }) {
  const small = "flex-1 rounded-xl border border-line bg-white py-2 text-center text-xs font-semibold";
  return (
    <div className="mt-4 space-y-2 text-left">
      {isAdmin && <p className="text-center text-xs font-semibold text-brand-ink">👑 단톡방에 결과를 알려 주세요</p>}
      <ShareActions
        path={`/m/${meetingId}`}
        kakaoLabel={tie ? "동점 결과 그대로 카카오톡 공유" : "카카오톡으로 결과 공유"}
        kakaoText={lines.join("\n")}
        buttonTitle="결과 보기"
        copyLabel="📋 문구 복사"
        copyText={(url) => [...lines, `👉 결과 보기: ${url}`].join("\n")}
        nativeTitle={lines[0]}
      >
        {canCalendar ? (
          <a href={`/m/${meetingId}/calendar`} className={small}>
            🗓 캘린더
          </a>
        ) : (
          <span className={`${small} border-dashed font-normal text-sub`}>{tie ? "🗓 날짜 확정 후" : "🗓 날짜 형식 아님"}</span>
        )}
      </ShareActions>
    </div>
  );
}

// 동점일 때 모임장이 동점 항목으로만 다시 투표를 연다. 새 마감 시간만 정하면 된다.
export function Revote({ meetingId }) {
  const [state, action, pending] = useActionState(revote.bind(null, meetingId), null);
  function confirmRevote(e) {
    if (!window.confirm("동점인 후보로만 다시 투표할까요? 동점이 아닌 후보는 빠지고, 모두의 투표가 처음부터 다시 시작돼요.")) e.preventDefault();
  }
  return (
    <form action={action} onSubmit={confirmRevote} className="mt-4 rounded-xl bg-white p-3 text-left">
      <p className="text-sm font-semibold">🔁 동점 항목으로 재투표</p>
      <p className="mt-0.5 text-xs text-sub">같은 링크·같은 명단으로, 동점이었던 후보만 남겨서 다시 투표해요. 이미 정해진 쪽은 그대로 확정돼요.</p>
      <label className="mt-2 block text-xs font-semibold" htmlFor="revote-deadline">
        새 마감 시간
      </label>
      <div className="mt-1 flex gap-2">
        <input
          id="revote-deadline"
          name="deadline"
          type="datetime-local"
          required
          className="min-w-0 flex-1 rounded-lg border border-line px-2 py-1.5 text-sm outline-none focus:border-brand"
        />
        <button disabled={pending} className="shrink-0 rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
          {pending ? "여는 중…" : "재투표 열기"}
        </button>
      </div>
      {state?.error && <p className="mt-1.5 text-xs text-red-600">{state.error}</p>}
    </form>
  );
}

// 동점일 때 모임장이 하나를 골라 확정 (이미 골랐으면 바꿀 수 있게)
export function PickTie({ meetingId, tied, current }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState(null);
  function pick(id) {
    start(async () => {
      const res = await pickFinal(meetingId, id);
      setError(res?.error || null);
    });
  }
  return (
    <div className="mt-2">
      <p className="text-xs text-sub">{current ? "다른 후보로 바꾸기" : "👑 하나를 골라 확정해 주세요"}</p>
      <div className="mt-1 flex flex-wrap justify-center gap-1.5">
        {tied.map((t) => (
          <button
            key={t.candidate.id}
            onClick={() => pick(t.candidate.id)}
            disabled={pending || t.candidate.id === current}
            className={`rounded-full border px-3 py-1 text-xs ${t.candidate.id === current ? "border-brand bg-brand text-white" : "border-line bg-white"} disabled:opacity-80`}
          >
            {t.candidate.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
