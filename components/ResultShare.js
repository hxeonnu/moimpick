"use client";

import { useActionState, useState, useTransition } from "react";
import { pickFinal, revote } from "@/app/actions";
import { useCopy, ManualCopy } from "./useCopy";

// 카카오톡 공유 SDK. 카카오 앱의 JavaScript 키가 있고, 사이트 주소가 카카오에 등록돼 있어야 동작한다.
// 키가 없거나 SDK를 못 불러오면 문구 복사로 대신한다.
const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
const KAKAO_SDK = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.4/kakao.min.js";
const KAKAO_SDK_HASH = "sha384-BGX7Wb16GmRFagri4bLJV2DgipVZaU2AI812GZtHtHzzDQJnfHasDXN5houxv45w";

function loadKakao() {
  if (window.Kakao) return Promise.resolve(window.Kakao);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = KAKAO_SDK;
    s.integrity = KAKAO_SDK_HASH;
    s.crossOrigin = "anonymous";
    s.onload = () => resolve(window.Kakao);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// 확정 결과 공지: 카카오톡 공유 / 문구 복사 / 캘린더에 추가
export function ResultShare({ meetingId, lines, canCalendar, isAdmin, tie }) {
  const { copy, copied, manual, close } = useCopy();
  const [error, setError] = useState(null);

  const url = () => `${window.location.origin}/m/${meetingId}`;
  const message = () => [...lines, `👉 결과 보기: ${url()}`].join("\n");

  async function shareKakao() {
    setError(null);
    if (!KAKAO_KEY) return copy(message());
    try {
      const Kakao = await loadKakao();
      if (!Kakao.isInitialized()) Kakao.init(KAKAO_KEY);
      Kakao.Share.sendDefault({
        objectType: "text",
        text: lines.join("\n").slice(0, 200),
        link: { mobileWebUrl: url(), webUrl: url() },
        buttonTitle: "결과 보기",
      });
    } catch {
      setError("카카오톡 공유를 열지 못했어요. 문구를 복사해서 올려 주세요.");
      copy(message());
    }
  }

  return (
    <div className="mt-4 space-y-2 text-left">
      {isAdmin && <p className="text-center text-xs font-semibold text-brand-ink">👑 단톡방에 결과를 알려 주세요</p>}
      <button onClick={shareKakao} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#FEE500] py-3 font-semibold text-[#191919]">
        💬 {tie ? "동점 결과 그대로 카카오톡 공유" : "카카오톡으로 결과 공유"}
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => copy(message())} className="rounded-xl border border-line bg-white py-2.5 text-sm font-semibold">
          {copied ? "복사됨" : "📋 결과 문구 복사"}
        </button>
        {canCalendar ? (
          <a href={`/m/${meetingId}/calendar`} className="rounded-xl border border-line bg-white py-2.5 text-center text-sm font-semibold">
            🗓 캘린더에 추가
          </a>
        ) : (
          <span className="rounded-xl border border-dashed border-line px-1 py-2.5 text-center text-xs text-sub">
            {tie ? "캘린더: 날짜가 정해지면 추가돼요" : "캘린더: 날짜 형식이 아니에요"}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <ManualCopy text={manual} onClose={close} />
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
