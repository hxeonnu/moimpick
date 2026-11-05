"use client";

import { useActionState, useState, useTransition } from "react";
import { addParticipant, closeNow, removeParticipant, resetParticipant } from "@/app/actions";
import ShareActions from "./ShareActions";

// 모임장에게만 보이는 메뉴. 모임장 링크 보관, 참여자 추가·빼기, 이름 잠금 풀기.
export default function AdminPanel({ meetingId, meetingTitle, adminToken, participants, closed }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState(null);
  const claimed = participants.filter((p) => p.claimed);
  const [added, addAction, adding] = useActionState(addParticipant.bind(null, meetingId), null);

  function closeEarly() {
    if (!window.confirm("지금 투표를 마감할까요? 마감하면 더 이상 투표·수정할 수 없고 결과가 확정돼요.")) return;
    start(async () => {
      const res = await closeNow(meetingId);
      setError(res?.error || null);
    });
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
        이 기기는 모임장으로 기억돼 있어요. 기록이 지워지거나 다른 폰에서 관리할 때를 위해 모임장 링크를 보관해 두세요. 카톡 공유 창에서
        &lsquo;나와의 채팅&rsquo;을 고르면 나에게만 보내져요. (단톡방에는 올리지 마세요)
      </p>
      <div className="mt-2">
        <ShareActions
          path={`/m/${meetingId}/admin?t=${adminToken}`}
          kakaoLabel="모임장 링크를 카톡 '나와의 채팅'에 보내기"
          kakaoText={`👑 ${meetingTitle} 모임장 링크\n이 링크로 들어가면 어느 기기에서든 모임장으로 관리할 수 있어요. 단톡방에는 올리지 마세요.`}
          buttonTitle="모임장으로 열기"
          copyLabel="🔗 모임장 링크 복사"
          copyText={(url) => url}
          nativeTitle="모임픽 모임장 링크"
        />
      </div>

      {!closed && (
        <div className="mt-4">
          <p className="text-xs font-semibold">지금 마감하기</p>
          <p className="mt-0.5 text-xs text-sub">다 모였으면 마감 시간을 기다리지 않고 바로 결과를 확정해요.</p>
          <button
            onClick={closeEarly}
            disabled={pending}
            className="mt-2 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-60"
          >
            지금 마감하기
          </button>
        </div>
      )}

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
