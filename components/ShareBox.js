"use client";

import { useSyncExternalStore } from "react";
import { useCopy, ManualCopy } from "./useCopy";

// 서버에서는 주소를 모르므로 빈 값, 브라우저에서는 현재 사이트 주소를 쓴다.
const noop = () => () => {};
const useOrigin = () => useSyncExternalStore(noop, () => window.location.origin, () => "");

export default function ShareBox({ meetingId, title, highlight }) {
  const origin = useOrigin();
  const url = origin ? `${origin}/m/${meetingId}` : "";
  const { copy, copied, manual, close } = useCopy();
  const message = `${title} 투표해 줘! 👉 ${url}`;

  // 휴대폰은 공유 창(카톡 등)을 띄우고, 공유 기능이 없는 브라우저는 복사로 대신한다.
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: `${title} 투표해 줘!`, url });
        return;
      } catch (e) {
        if (e.name === "AbortError") return; // 사용자가 공유 창을 닫음
      }
    }
    copy(message);
  }

  return (
    <section className={`rounded-2xl p-4 ${highlight ? "bg-brand-soft" : "bg-white"}`}>
      {highlight && <p className="mb-2 font-semibold text-brand-ink">모임이 만들어졌어요! 링크를 단톡방에 올려 주세요.</p>}
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate rounded-lg bg-canvas px-3 py-2 text-xs text-sub">{url || "…"}</p>
        <button onClick={() => copy(message)} className="shrink-0 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold">
          {copied ? "복사됨" : "링크 복사"}
        </button>
        <button onClick={share} className="shrink-0 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white">
          공유
        </button>
      </div>
      <ManualCopy text={manual} onClose={close} />
    </section>
  );
}
