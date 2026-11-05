"use client";

import ShareActions, { useOrigin } from "./ShareActions";

// 투표 링크 공유. 모임을 막 만들었을 때(highlight)는 단톡방에 올려 달라고 크게 안내한다.
export default function ShareBox({ meetingId, title, deadline, highlight }) {
  const origin = useOrigin();
  const path = `/m/${meetingId}`;

  return (
    <section className={`rounded-2xl p-4 ${highlight ? "bg-brand-soft" : "bg-white"}`}>
      {highlight && <p className="mb-2 font-semibold text-brand-ink">모임이 만들어졌어요! 링크를 단톡방에 올려 주세요.</p>}
      <p className="mb-2 truncate rounded-lg bg-canvas px-3 py-2 text-xs text-sub">{origin ? `${origin}${path}` : "…"}</p>
      <ShareActions
        path={path}
        kakaoLabel="카카오톡으로 투표 링크 보내기"
        kakaoText={`📮 ${title}\n투표에 참여해 주세요! (마감 ${deadline})`}
        buttonTitle="투표하러 가기"
        copyLabel="🔗 링크 복사"
        copyText={(url) => `${title} 투표해 줘! (마감 ${deadline}) 👉 ${url}`}
        nativeTitle={title}
      />
    </section>
  );
}
