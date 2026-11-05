"use client";

import { useState, useSyncExternalStore } from "react";
import { useCopy, ManualCopy } from "./useCopy";

// 공유 버튼 묶음: 카카오톡 공유를 크게, 링크·문구 복사와 다른 앱 공유(휴대폰 공유 창)를 작게.
// 모임 대부분이 카톡 단톡방이고, 링크를 가장 많이 여는 카톡 앱 안 브라우저에서는 공유 창이 잘 안 떠서 카톡 공유를 기본으로 둔다.

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

// 서버에서는 주소와 공유 창 지원 여부를 모르므로, 화면에서만 읽는다.
const noop = () => () => {};
export const useOrigin = () => useSyncExternalStore(noop, () => window.location.origin, () => "");
const useCanNativeShare = () => useSyncExternalStore(noop, () => typeof navigator.share === "function", () => false);

// path: 공유할 페이지 경로 (예: /m/모임id). kakaoText는 카톡 카드에 들어갈 글(200자까지), copyText(url)는 복사할 문구.
export default function ShareActions({ path, kakaoLabel, kakaoText, buttonTitle, copyLabel, copyText, nativeTitle, children }) {
  const origin = useOrigin();
  const canNative = useCanNativeShare();
  const { copy, copied, manual, close } = useCopy();
  const [error, setError] = useState(null);
  const url = () => `${window.location.origin}${path}`;

  async function shareKakao() {
    setError(null);
    if (!KAKAO_KEY) return copy(copyText(url()));
    try {
      const Kakao = await loadKakao();
      if (!Kakao.isInitialized()) Kakao.init(KAKAO_KEY);
      Kakao.Share.sendDefault({
        objectType: "text",
        text: kakaoText.slice(0, 200),
        link: { mobileWebUrl: url(), webUrl: url() },
        buttonTitle,
      });
    } catch {
      setError("카카오톡 공유를 열지 못했어요. 문구를 복사해서 올려 주세요.");
      copy(copyText(url()));
    }
  }

  async function shareNative() {
    try {
      await navigator.share({ title: nativeTitle, text: copyText(url()) });
    } catch (e) {
      if (e.name !== "AbortError") copy(copyText(url())); // 닫은 게 아니라 실패면 복사로
    }
  }

  const small = "flex-1 rounded-xl border border-line bg-white py-2 text-center text-xs font-semibold";

  return (
    <div className="space-y-2">
      <button
        onClick={shareKakao}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#FEE500] py-3 font-semibold text-[#191919]"
      >
        💬 {kakaoLabel}
      </button>
      <div className="flex gap-2">
        <button onClick={() => copy(copyText(url()))} className={small} disabled={!origin}>
          {copied ? "복사됨" : copyLabel}
        </button>
        {canNative && (
          <button onClick={shareNative} className={small}>
            📤 다른 앱으로
          </button>
        )}
        {children}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <ManualCopy text={manual} onClose={close} />
    </div>
  );
}
