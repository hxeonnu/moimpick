"use client";

import { useActionState, useState } from "react";
import { createMeeting } from "@/app/actions";
import ListInput from "./ListInput";
import { DateList } from "./DateInputs";

const input = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[15px] outline-none focus:border-brand";
const label = "mb-1.5 block text-sm font-semibold";

export default function CreateForm() {
  const [state, action, pending] = useActionState(createMeeting, null);
  const [mode, setMode] = useState("both");
  // 제출하면 React가 폼을 비우는데, 오류가 나도 적은 내용이 남도록 값을 직접 들고 있는다.
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");

  return (
    <form action={action} className="space-y-5 rounded-2xl bg-white p-5">
      <div>
        <label className={label} htmlFor="title">모임 이름</label>
        <input
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={input}
          placeholder="종강 모임 약속 잡기"
          required
        />
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
        <input
          id="deadline"
          name="deadline"
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className={input}
          required
        />
      </div>

      <div>
        <span className={label}>참여자 명단</span>
        <ListInput name="names" placeholders={["민수", "지영", "현우", "이름"]} initial={3} min={2} required addLabel="한 명 더" />
        <p className="mt-1 text-xs text-sub">칸 하나에 한 명씩. 투표할 때 여기서 자기 이름을 골라요.</p>
      </div>

      {mode !== "place" && (
        <div>
          <span className={label}>날짜 후보 (선택)</span>
          <DateList name="dates" />
        </div>
      )}

      {mode !== "date" && (
        <div>
          <span className={label}>장소 후보 (선택)</span>
          <ListInput
            name="places"
            placeholders={["장소 이름 또는 카카오맵 링크"]}
            initial={2}
            addLabel="장소 추가"
          />
          <p className="mt-1 text-xs text-sub">
            칸 하나에 한 곳씩. 카카오맵 링크가 가장 정확하고, 이름만 적을 땐 지점까지 적어 주세요. (예: 레드버튼 경성대점)
            네이버 지도 링크는 한 칸에 이름과 같이 붙여 주세요.
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
