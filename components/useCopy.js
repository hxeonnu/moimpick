"use client";

import { useState } from "react";

// 클립보드 복사. 카카오톡 같은 앱 안 브라우저나 일부 브라우저는 navigator.clipboard 쓰기를 막아서
// (NotAllowedError: Write permission denied) 실패하면 옛 방식(execCommand)으로 한 번 더 시도한다.
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      el.setSelectionRange(0, text.length);
      const ok = document.execCommand("copy");
      el.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

// 둘 다 막히면 복사할 글을 화면에 띄워서 직접 복사하게 한다.
export function useCopy() {
  const [status, setStatus] = useState(null);
  async function copy(text) {
    if (await copyText(text)) {
      setStatus("copied");
      setTimeout(() => setStatus(null), 1500);
    } else {
      setStatus({ manual: text });
    }
  }
  return { copy, copied: status === "copied", manual: status?.manual || null, close: () => setStatus(null) };
}

export function ManualCopy({ text, onClose }) {
  if (!text) return null;
  return (
    <div className="mt-2 rounded-lg border border-line bg-white p-2.5 text-xs">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-sub">자동 복사가 막혀 있어요. 아래 글을 길게 눌러 복사해 주세요.</p>
        <button type="button" onClick={onClose} className="shrink-0 text-sub">
          닫기
        </button>
      </div>
      <textarea
        readOnly
        autoFocus
        value={text}
        rows={2}
        onFocus={(e) => e.target.select()}
        className="w-full resize-none rounded-md bg-canvas px-2 py-1.5 text-[13px] outline-none"
      />
    </div>
  );
}
