"use client";

import { useActionState, useState, useTransition } from "react";
import { setAbsent, submitVote } from "@/app/actions";
import PlaceInfo from "./PlaceInfo";

const PREFS = [
  ["good", "좋음"],
  ["neutral", "보통"],
  ["bad", "싫음"],
];

function NewBadge() {
  return <span className="ml-1.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">NEW</span>;
}

// 이름을 고르면 먼저 참석 여부를 묻는다. 불참이면 투표 칸 없이 계산에서 빠지고, 마감 전까지 바꿀 수 있다.
export default function VoteForm(props) {
  const { meetingId, voted, absent } = props;
  const [choice, setChoice] = useState(absent ? "absent" : voted ? "attend" : null);
  const [pending, start] = useTransition();
  const [error, setError] = useState(null);

  function goAbsent() {
    start(async () => {
      const res = await setAbsent(meetingId);
      if (res?.error) setError(res.error);
      else setChoice("absent");
    });
  }

  if (choice === "attend") return <Ballot {...props} onAbsent={goAbsent} absentPending={pending} />;

  return (
    <section className="rounded-2xl bg-white p-4">
      {choice === "absent" ? (
        <>
          <p className="font-bold">🙅 불참으로 표시했어요</p>
          <p className="mt-1 text-sm text-sub">순위 계산에서 빠져요. 마감 전까지 언제든 바꿀 수 있어요.</p>
          <button onClick={() => setChoice("attend")} className="mt-3 w-full rounded-xl border border-line py-2.5 text-sm font-semibold">
            참석으로 바꾸기
          </button>
        </>
      ) : (
        <>
          <p className="font-bold">이번 모임 참석할 수 있나요?</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => setChoice("attend")} className="rounded-xl bg-brand py-3 font-semibold text-white">
              ✅ 참석할래요
            </button>
            <button onClick={goAbsent} disabled={pending} className="rounded-xl border border-line py-3 font-semibold disabled:opacity-60">
              {pending ? "저장하는 중…" : "🙅 이번엔 불참"}
            </button>
          </div>
          <p className="mt-2 text-xs text-sub">가고 싶은데 날짜만 안 맞으면 &lsquo;참석&rsquo;을 누르고 되는 날짜를 비워 두세요.</p>
        </>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}

function Ballot({ meetingId, mode, dates, places, budget, voted, absent, onAbsent, absentPending }) {
  const [state, action, pending] = useActionState(submitVote.bind(null, meetingId), null);
  const hasNew = [...dates, ...places].some((c) => c.isNew);

  return (
    <form action={action} className="space-y-4 rounded-2xl bg-white p-4">
      <div className="flex items-center justify-between text-xs text-sub">
        <span>{absent ? "참석으로 투표하고 저장하면 불참이 풀려요." : "✅ 참석으로 투표 중"}</span>
        <button type="button" onClick={onAbsent} disabled={absentPending} className="underline disabled:opacity-60">
          이번엔 불참
        </button>
      </div>
      {hasNew && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">새 후보가 추가됐어요. 확인하고 다시 저장해 주세요.</p>
      )}

      {mode !== "place" && (
        <div>
          <h2 className="font-bold">
            📅 되는 날짜 <span className="text-xs font-normal text-sub">모두 체크해 주세요</span>
          </h2>
          {dates.length === 0 && <p className="mt-2 text-sm text-sub">아직 날짜 후보가 없어요. 아래에서 추가해 주세요.</p>}
          <div className="mt-2 space-y-1.5">
            {dates.map((d) => (
              <label key={d.id} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line px-3 py-2.5 has-checked:border-brand has-checked:bg-brand-soft">
                <input type="hidden" name="shown" value={d.id} />
                <input type="checkbox" name={`d_${d.id}`} defaultChecked={d.mine === "yes"} className="size-4 accent-brand" />
                <span className="text-[15px]">{d.label}</span>
                {d.isNew && <NewBadge />}
              </label>
            ))}
          </div>
        </div>
      )}

      {mode !== "date" && (
        <div>
          <h2 className="font-bold">
            📍 장소 <span className="text-xs font-normal text-sub">좋은 곳·싫은 곳만 눌러 주세요</span>
          </h2>
          {places.length === 0 && <p className="mt-2 text-sm text-sub">아직 장소 후보가 없어요. 아래에서 추가해 주세요.</p>}
          <div className="mt-2 space-y-2">
            {places.map((p) => (
              <div key={p.id} className="rounded-xl border border-line p-3">
                <input type="hidden" name="shown" value={p.id} />
                <div className="flex items-start">
                  <PlaceInfo place={p} />
                  {p.isNew && <NewBadge />}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {PREFS.map(([value, text]) => (
                    <label
                      key={value}
                      className="cursor-pointer rounded-lg border border-line py-1.5 text-center text-sm text-sub has-checked:border-brand has-checked:bg-brand has-checked:font-semibold has-checked:text-white"
                    >
                      <input type="radio" name={`p_${p.id}`} value={value} defaultChecked={(p.mine || "neutral") === value} className="sr-only" />
                      {text}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mode !== "date" && (
        <label className="flex items-center justify-between gap-3 rounded-xl bg-canvas px-3 py-2.5 text-sm">
          <span>💰 내 1인 예산</span>
          <span className="flex items-center gap-1">
            <input
              name="budget"
              inputMode="numeric"
              defaultValue={budget ?? ""}
              placeholder="제한 없음"
              className="w-28 rounded-lg border border-line bg-white px-2 py-1 text-right"
            />
            원까지
          </span>
        </label>
      )}

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-brand-ink">저장했어요. 마감 전까지 언제든 고칠 수 있어요.</p>}

      <button disabled={pending} className="w-full rounded-xl bg-brand py-3 font-semibold text-white disabled:opacity-60">
        {pending ? "저장하는 중…" : voted && !absent ? "내 투표 수정하기" : "투표하고 순위 보기"}
      </button>
    </form>
  );
}
