"use client";

import { useActionState, useState, useTransition } from "react";
import { setAbsent, submitVote } from "@/app/actions";
import PlaceInfo from "./PlaceInfo";
import { Toast } from "./Feedback";

const PREFS = [
  ["good", "좋음"],
  ["neutral", "보통"],
  ["bad", "싫음"],
];

function NewBadge() {
  return <span className="ml-1.5 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-600">NEW</span>;
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
            {/* 둘 다 같은 모양: 한쪽만 색이 있으면 이미 골라진 것처럼 보여서 (실제로는 눌러야 다음으로 넘어감) */}
            <button onClick={() => setChoice("attend")} className="rounded-xl border border-line py-3 font-semibold hover:border-brand">
              ✅ 참석할래요
            </button>
            <button onClick={goAbsent} disabled={pending} className="rounded-xl border border-line py-3 font-semibold hover:border-brand disabled:opacity-60">
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

function Ballot({ meetingId, mode, round, dates, places, budget, voted, absent, onAbsent, absentPending }) {
  const [state, action, pending] = useActionState(submitVote.bind(null, meetingId), null);
  const hasNew = [...dates, ...places].some((c) => c.isNew);
  // 재투표에서 후보가 하나만 남은 쪽은 이미 정해진 것이라 투표 없이 보여 주기만 한다.
  const fixedDate = round > 1 && dates.length === 1 ? dates[0] : null;
  const fixedPlace = round > 1 && places.length === 1 ? places[0] : null;

  return (
    <form action={action} className="space-y-4 rounded-2xl bg-white p-4">
      <div className="flex items-center justify-between text-xs text-sub">
        <span>{absent ? "참석으로 투표하고 저장하면 불참이 풀려요." : "✅ 참석으로 투표 중"}</span>
        <button type="button" onClick={onAbsent} disabled={absentPending} className="underline disabled:opacity-60">
          이번엔 불참
        </button>
      </div>
      {round > 1 && (
        <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-ink">
          🔁 {round}차 재투표예요. 동점이었던 후보로만 다시 골라 주세요.
        </p>
      )}
      {(fixedDate || fixedPlace) && (
        <div className="rounded-lg bg-canvas px-3 py-2 text-sm">
          {fixedDate && <p>📅 날짜는 <strong>{fixedDate.label}</strong>(으)로 정해졌어요.</p>}
          {fixedPlace && <p>📍 장소는 <strong>{fixedPlace.label}</strong>(으)로 정해졌어요.</p>}
        </div>
      )}
      {hasNew && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">새 후보가 추가됐어요. 확인하고 다시 저장해 주세요.</p>
      )}

      {mode !== "place" && !fixedDate && (
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

      {mode !== "date" && !fixedPlace && (
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

      {mode !== "date" && !fixedPlace && (
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
      {state?.ok && <Toast key={state.at}>✅ 투표를 저장했어요</Toast>}
      {state?.ok && <p className="text-xs text-sub">마감 전까지 언제든 고칠 수 있어요.</p>}

      <button disabled={pending} className="w-full rounded-xl bg-brand py-3 font-semibold text-white disabled:opacity-60">
        {pending ? "저장하는 중…" : voted && !absent ? "내 투표 수정하기" : "투표하고 순위 보기"}
      </button>
    </form>
  );
}
