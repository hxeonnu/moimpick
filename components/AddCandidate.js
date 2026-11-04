"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addCandidate } from "@/app/actions";

const input = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand";

export default function AddCandidate({ meetingId, mode }) {
  const [kind, setKind] = useState(mode === "place" ? "place" : "date");
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [state, action, pending] = useActionState(addCandidate.bind(null, meetingId), null);
  const formRef = useRef(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  // 이미 투표한 친구들은 링크를 다시 안 열기 때문에, 단톡방에 붙일 문구를 바로 복사할 수 있게 한다.
  async function copyNotice() {
    const url = `${window.location.origin}/m/${meetingId}`;
    await navigator.clipboard.writeText(`${state.label}도 후보로 추가했어! 다시 체크 부탁해 👉 ${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full rounded-2xl border border-dashed border-line bg-white py-3 text-sm font-semibold text-sub">
        + 날짜나 장소 후보 추가하기
      </button>
    );
  }

  return (
    <section className="rounded-2xl bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold">후보 추가</h2>
        <button onClick={() => setOpen(false)} className="text-sm text-sub">닫기</button>
      </div>

      {mode === "both" && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          {[
            ["date", "날짜"],
            ["place", "장소"],
          ].map(([value, text]) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              className={`rounded-lg border py-1.5 text-sm ${kind === value ? "border-brand bg-brand-soft font-semibold text-brand-ink" : "border-line"}`}
            >
              {text}
            </button>
          ))}
        </div>
      )}

      <form ref={formRef} action={action} className="space-y-2">
        <input type="hidden" name="kind" value={kind} />
        {kind === "date" ? (
          <input name="label" className={input} placeholder="예: 11/7 (금) 저녁" required />
        ) : (
          <>
            <input name="label" className={input} placeholder="장소 이름 또는 지도 링크 (필수)" required />
            <p className="text-xs text-sub">
              식당, 카페, 보드게임카페처럼 놀 곳도 돼요. 이름만 적을 땐 지점이나 대략적인 위치도 같이 적어 주세요.
              (예: 금수돼지국밥 경성대점, 레드버튼 경성대점) 카카오맵 링크는 그대로 붙여 넣으면 되고, 네이버 지도 링크는 앞에 장소
              이름을 같이 적어 주세요.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <input name="region" className={input} placeholder="위치 (예: 경성대)" />
              <input name="price" inputMode="numeric" className={input} placeholder="1인 가격 (선택)" />
            </div>
            <input name="description" className={input} placeholder="한 줄 설명 (선택)" />
          </>
        )}
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button disabled={pending} className="w-full rounded-lg bg-ink py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "추가하는 중…" : "추가하기"}
        </button>
      </form>

      {state?.ok && (
        <div className="mt-3 rounded-lg bg-brand-soft p-3 text-sm">
          <p>
            <strong>{state.label}</strong> 추가됨. 이미 투표한 친구들에게 단톡방으로 알려 주세요.
          </p>
          <button onClick={copyNotice} className="mt-2 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white">
            {copied ? "복사됨" : "단톡방 알림 문구 복사"}
          </button>
        </div>
      )}
    </section>
  );
}
