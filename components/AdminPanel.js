"use client";

import { useActionState, useState, useTransition } from "react";
import { addParticipant, removeParticipant, resetParticipant } from "@/app/actions";
import { useCopy, ManualCopy } from "./useCopy";

// 모임장에게만 보이는 메뉴. 모임장 링크 보관, 참여자 추가·빼기, 이름 잠금 풀기.
export default function AdminPanel({ meetingId, adminToken, participants, closed }) {
  const { copy, copied, manual, close } = useCopy();
  const [pending, start] = useTransition();
  const [error, setError] = useState(null);
  const claimed = participants.filter((p) => p.claimed);
  const [added, addAction, adding] = useActionState(addParticipant.bind(null, meetingId), null);

  function copyAdminLink() {
    copy(`${window.location.origin}/m/${meetingId}/admin?t=${adminToken}`);
  }

  // 명단 빼기는 "불참 지정"이 아니라 애초에 대상이 아닌 사람을 지우는 것 (스크린샷에 섞인 사람, 오타·중복)
  function remove(p) {
    if (!window.confirm(`${p.name}을(를) 명단에서 뺄까요? ${p.name}이(가) 한 투표와 이름 잠금도 함께 지워져요.`)) return;
    start(async () => {
      const res = await removeParticipant(meetingId, p.id);
      setError(res?.error || null);
    });
  }

  function reset(p) {
    if (!window.confirm(`${p.name}의 이름 잠금을 풀까요? ${p.name}이(가) 한 투표도 함께 지워지고, 이름을 다시 고를 수 있게 돼요.`)) return;
    start(async () => {
      const res = await resetParticipant(meetingId, p.id);
      setError(res?.error || null);
    });
  }

  return (
    <section className="rounded-2xl border border-dashed border-brand/40 bg-white p-4">
      <h2 className="text-sm font-bold">👑 모임장 메뉴</h2>
      <p className="mt-1 text-xs text-sub">
        이 기기는 모임장으로 기억돼 있어요. 다른 폰에서도 관리하려면 모임장 링크를 보관해 두세요. (단톡방에는 올리지 마세요)
      </p>
      <button onClick={copyAdminLink} className="mt-2 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold">
        {copied ? "복사됨" : "모임장 링크 복사"}
      </button>
      <ManualCopy text={manual} onClose={close} />

      {!closed && (
        <div className="mt-4">
          <p className="text-xs font-semibold">참여자 추가</p>
          <p className="mt-0.5 text-xs text-sub">나중에 합류한 친구를 명단에 넣어요. 추가한 뒤 단톡방 링크로 들어와 이름을 고르면 돼요.</p>
          <form action={addAction} className="mt-2 flex gap-2">
            <input
              name="name"
              maxLength={20}
              required
              placeholder="이름"
              className="min-w-0 flex-1 rounded-lg border border-line px-3 py-1.5 text-sm outline-none focus:border-brand"
            />
            <button disabled={adding} className="shrink-0 rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
              {adding ? "추가하는 중…" : "추가"}
            </button>
          </form>
          {added?.error && <p className="mt-1.5 text-xs text-red-600">{added.error}</p>}
          {added?.ok && <p className="mt-1.5 text-xs text-emerald-700">{added.name} 추가됨</p>}
        </div>
      )}

      {!closed && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-semibold">명단에서 빼기</summary>
          <p className="mt-1 text-xs text-sub">
            모임 대상이 아닌 사람(잘못 들어간 이름, 중복)을 지워요. 못 오는 사람은 본인이 &lsquo;이번엔 불참&rsquo;을 누르면 돼요.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {participants.map((p) => (
              <button
                key={p.id}
                onClick={() => remove(p)}
                disabled={pending || participants.length <= 2}
                className="rounded-full border border-line px-2.5 py-1 text-xs disabled:opacity-60"
              >
                🗑 {p.name}
              </button>
            ))}
          </div>
        </details>
      )}

      {!closed && claimed.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold">이름 잠금 풀기</p>
          <p className="mt-0.5 text-xs text-sub">번호를 잊었거나, 다른 사람이 먼저 그 이름을 골랐을 때 써요.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {claimed.map((p) => (
              <button
                key={p.id}
                onClick={() => reset(p)}
                disabled={pending}
                className="rounded-full border border-line px-2.5 py-1 text-xs disabled:opacity-60"
              >
                🔓 {p.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}
