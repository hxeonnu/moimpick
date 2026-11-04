"use client";

import { forgetParticipant } from "@/app/actions";
import { useCopy, ManualCopy } from "./useCopy";

// 이름을 처음 고른 직후 한 번 크게 보여 주는 내 번호 안내
export function PinNotice({ pin }) {
  const { copy, copied, manual, close } = useCopy();
  return (
    <section className="rounded-2xl bg-brand-soft p-4">
      <p className="font-semibold text-brand-ink">
        🔐 내 번호는 <span className="text-xl tracking-[0.2em]">{pin}</span> 이에요
      </p>
      <p className="mt-1 text-xs text-sub">
        다른 폰이나 브라우저(카톡 ↔ 크롬)에서 들어올 때 이 번호가 필요해요. 캡처하거나 복사해 두세요. 위쪽 이름 옆에서도 다시 볼 수
        있어요.
      </p>
      <button onClick={() => copy(pin)} className="mt-2 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white">
        {copied ? "복사됨" : "번호 복사"}
      </button>
      <ManualCopy text={manual} onClose={close} />
    </section>
  );
}

// 머리말의 "이 기기에서 나가기". 나가도 이름은 내 것으로 잠긴 채 남아서, 번호를 모르면 못 돌아온다.
export function LeaveButton({ meetingId, pin }) {
  function leave(e) {
    if (!window.confirm(`이 기기에서 나가면 다시 들어올 때 번호(${pin})가 필요해요. 나갈까요?`)) e.preventDefault();
  }
  return (
    <form action={forgetParticipant.bind(null, meetingId)} onSubmit={leave} className="inline">
      <button className="underline">나가기</button>
    </form>
  );
}
