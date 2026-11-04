// 마감 후 확정 결과. 1위가 동점이면 모임장이 고르도록 안내한다.
function topOf(ranks, key) {
  if (!ranks.length) return null;
  const best = key(ranks[0]);
  return ranks.filter((r) => key(r) === best);
}

export default function FinalResult({ mode, dateRanks, placeRanks }) {
  const dates = mode !== "place" ? topOf(dateRanks, (d) => d.yes.length) : null;
  const places = mode !== "date" ? topOf(placeRanks, (p) => `${p.score}/${p.overBudget}`) : null;

  const line = (list, label) =>
    !list ? null : list.length === 1 ? (
      <p className="text-lg font-bold">{label(list[0])}</p>
    ) : (
      <p className="text-sm">
        <strong>{list.map(label).join(" / ")}</strong> 동점이에요. 모임장이 골라 주세요.
      </p>
    );

  return (
    <section className="rounded-2xl bg-brand-soft p-5 text-center">
      <p className="text-sm font-semibold text-brand-ink">투표가 마감됐어요. 약속이 정해졌어요!</p>
      <div className="mt-3 space-y-1">
        {mode !== "place" && (dates ? line(dates, (d) => `📅 ${d.candidate.label}`) : <p className="text-sm text-sub">날짜 후보가 없었어요.</p>)}
        {mode !== "date" && (places ? line(places, (p) => `📍 ${p.candidate.label}`) : <p className="text-sm text-sub">장소 후보가 없었어요.</p>)}
      </div>
    </section>
  );
}
