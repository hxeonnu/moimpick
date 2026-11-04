"use client";

import { useActionState, useState } from "react";
import { createMeeting } from "@/app/actions";

const input = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[15px] outline-none focus:border-brand";
const label = "mb-1.5 block text-sm font-semibold";

export default function CreateForm() {
  const [state, action, pending] = useActionState(createMeeting, null);
  const [mode, setMode] = useState("both");

  return (
    <form action={action} className="space-y-5 rounded-2xl bg-white p-5">
      <div>
        <label className={label} htmlFor="title">모임 이름</label>
        <input id="title" name="title" className={input} placeholder="종강 모임 약속 잡기" required />
      </div>

      <div>
        <span className={label}>무엇을 정할까요?</span>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["both", "날짜 + 장소"],
            ["date", "날짜만"],
            ["place", "장소만"],
          ].map(([value, text]) => (
            <label
              key={value}
              className={`cursor-pointer rounded-xl border py-2 text-center text-sm ${mode === value ? "border-brand bg-brand-soft font-semibold text-brand-ink" : "border-line"}`}
            >
              <input type="radio" name="mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="sr-only" />
              {text}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className={label} htmlFor="deadline">투표 마감 시간</label>
        <input id="deadline" name="deadline" type="datetime-local" className={input} required />
      </div>

      <div>
        <label className={label} htmlFor="names">참여자 명단</label>
        <textarea id="names" name="names" rows={4} className={input} placeholder={"민수\n지영\n현우"} required />
        <p className="mt-1 text-xs text-sub">한 줄에 한 명씩. 투표할 때 여기서 자기 이름을 골라요.</p>
      </div>

      {mode !== "place" && (
        <div>
          <label className={label} htmlFor="dates">날짜 후보 (선택)</label>
          <textarea id="dates" name="dates" rows={3} className={input} placeholder={"11/8 (토) 저녁\n11/9 (일) 점심"} />
        </div>
      )}

      {mode !== "date" && (
        <div>
          <label className={label} htmlFor="places">장소 후보 (선택)</label>
          <textarea id="places" name="places" rows={3} className={input} placeholder={"금수돼지국밥 경성부경대점\n레드버튼 경성대점\nhttps://place.map.kakao.com/…"} />
          <p className="mt-1 text-xs text-sub">
            한 줄에 하나씩 적어 주세요. 카카오맵 링크가 가장 정확하고, 이름만 적을 땐 지점까지 적어 주세요. 네이버 지도
            링크는 이름과 같이 붙여 주세요.
          </p>
        </div>
      )}

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button disabled={pending} className="w-full rounded-xl bg-brand py-3 font-semibold text-white disabled:opacity-60">
        {pending ? "만드는 중…" : "모임 만들고 링크 받기"}
      </button>
    </form>
  );
}
