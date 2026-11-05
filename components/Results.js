import PlaceInfo from "./PlaceInfo";

function Rank({ n }) {
  return (
    <span className={`grid size-6 shrink-0 place-items-center rounded-md text-xs font-bold ${n === 1 ? "bg-brand text-white" : "bg-canvas text-sub"}`}>
      {n}
    </span>
  );
}

export default function Results({ mode, dateRanks, placeRanks, noCommon, count }) {
  const total = count.attending;
  return (
    <>
      {/* 순위는 참석으로 응답한 사람만으로 계산한다. 몇 명의 의견인지 먼저 보여 준다. */}
      <p className="rounded-2xl bg-white px-4 py-3 text-sm">
        📊 <strong>참석 {count.attending}명 기준</strong>
        <span className="text-sub">
          {" "}
          · 불참 {count.absent} · 무응답 {count.noResponse}
        </span>
      </p>
      {mode !== "place" && (
        <section className="rounded-2xl bg-white p-4">
          <h2 className="mb-2 text-sm font-bold">📅 날짜 순위</h2>
          {dateRanks.length === 0 && <p className="text-sm text-sub">날짜 후보가 없어요.</p>}
          {noCommon && (
            <div className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-semibold">참석자 모두 되는 날짜가 아직 없어요.</p>
              {noCommon.map((d) => (
                <p key={d.label}>
                  {d.label}: {d.cannot.join(", ")} 안 됨
                </p>
              ))}
              <p className="mt-1">다른 날짜 후보를 추가해 보세요.</p>
            </div>
          )}
          <ul className="divide-y divide-line">
            {dateRanks.map((d, i) => (
              <li key={d.candidate.id} className="flex items-center gap-3 py-2">
                <Rank n={i + 1} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{d.candidate.label}</p>
                  <p className="text-xs text-sub">
                    가능 {d.yes.length}
                    {d.no.length > 0 && ` · ${d.no.join(", ")} 안 됨`}
                    {d.unknown.length > 0 && ` · 아직 답 안 함 ${d.unknown.length}`}
                  </p>
                  <div className="mt-1 h-1.5 rounded-full bg-canvas">
                    <div className="h-1.5 rounded-full bg-brand" style={{ width: `${total ? (d.yes.length / total) * 100 : 0}%` }} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {mode !== "date" && (
        <section className="rounded-2xl bg-white p-4">
          <h2 className="mb-2 text-sm font-bold">📍 장소 순위</h2>
          {placeRanks.length === 0 && <p className="text-sm text-sub">장소 후보가 없어요.</p>}
          <ul className="divide-y divide-line">
            {placeRanks.map((p, i) => (
              <li key={p.candidate.id} className="flex items-center gap-3 py-2">
                <Rank n={i + 1} />
                <div className="min-w-0 flex-1">
                  <PlaceInfo place={p.candidate} compact />
                  <p className="text-xs text-sub">
                    좋음 {p.good} · 보통 {p.neutral} · 싫음 {p.bad}
                    {p.unknown > 0 && ` · 아직 답 안 함 ${p.unknown}`}
                  </p>
                </div>
                {p.overBudget > 0 ? (
                  <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">{p.overBudget}명 예산 초과</span>
                ) : p.candidate.price_min ? (
                  <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">예산 OK</span>
                ) : null}
                <span className="w-8 shrink-0 text-right font-bold">{p.score > 0 ? `+${p.score}` : p.score}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="text-center text-xs text-sub">마감되면 날짜 1위와 장소 1위가 약속으로 확정돼요</p>
    </>
  );
}
