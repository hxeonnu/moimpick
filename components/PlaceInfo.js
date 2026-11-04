import { mapLinks, priceRange, priceFromAi } from "@/lib/format";

const KIND_ICON = { 식당: "🍚", 카페: "☕", 술집: "🍺", 놀거리: "🎲", 기타: "📍" };
// "🎲 놀거리 (보드카페)"처럼 카카오 업종의 세부 분류를 같이 보여 준다.
const kindText = (s) => {
  const icon = KIND_ICON[s.kind] || "📍";
  return `${icon} ${s.kind}${s.kindDetail && s.kindDetail !== s.kind ? ` (${s.kindDetail})` : ""}`;
};

function AiSummary({ place }) {
  const s = place.ai_summary;
  if (place.ai_status === "pending") {
    return <p className="mt-1.5 rounded-lg bg-[#f7f7fe] px-2.5 py-2 text-xs text-sub">✨ AI가 장소 정보를 찾아 요약하는 중이에요…</p>;
  }
  if (place.ai_status === "failed") {
    return <p className="mt-1.5 rounded-lg bg-canvas px-2.5 py-2 text-xs text-sub">AI가 이 장소 정보를 찾지 못했어요. 지도 링크에서 확인해 주세요.</p>;
  }
  if (place.ai_status !== "done" || !s) return null;

  const hours = [s.hours, s.breakTime && s.breakTime !== "없음" ? `브레이크 ${s.breakTime}` : null, s.closedDays].filter(Boolean).join(" · ");
  const sources = place.ai_sources?.sources || [];
  const suggestions = place.ai_sources?.suggestions;

  return (
    <div className="mt-1.5 rounded-lg bg-[#f7f7fe] px-2.5 py-2 text-xs leading-relaxed">
      <p className="font-semibold text-brand-ink">
        ✨ AI 요약
        {s.kind && <span className="ml-1 font-normal text-sub">· {kindText(s)}</span>}
      </p>
      {s.oneLine && <p className="text-[13px] text-ink">{s.oneLine}</p>}
      {s.menus?.length > 0 && <p className="text-sub">대표 {s.menus.join(" · ")}</p>}
      {hours && <p className="text-sub">영업 {hours}</p>}
      {s.branchUnsure && <p className="text-amber-700">같은 이름의 다른 지점 정보가 섞였을 수 있어요.</p>}
      <p className="mt-1 text-[11px] text-sub">ⓘ 가격·영업시간이 최신이 아닐 수 있어요. 링크에서 확인해 주세요.</p>
      <details className="mt-1">
        <summary className="cursor-pointer text-[11px] text-sub">자세히</summary>
        <div className="mt-1 space-y-1 text-sub">
          {s.address && <p>주소 {s.address}</p>}
          {s.review && <p>후기 {s.review}</p>}
          {sources.length > 0 && (
            <div>
              <p>출처</p>
              <ul className="ml-3 list-disc">
                {sources.map((src, i) => (
                  <li key={i}>
                    <a href={src.uri} target="_blank" rel="noreferrer" className="underline">
                      {src.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* 구글 검색 기능(Grounding)을 쓰면 검색 제안을 꼭 보여 줘야 한다. */}
          {suggestions && <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: suggestions }} />}
        </div>
      </details>
    </div>
  );
}

// 장소 후보의 이름·설명·가격·지도 링크. 투표 화면과 결과 화면이 같이 쓴다.
export default function PlaceInfo({ place, compact = false }) {
  const links = mapLinks(place);
  const price = priceRange(place);
  const basis = priceFromAi(place) ? place.ai_summary.priceBasis : null;

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold">
          {place.label}
          {place.region && <span className="ml-1 text-xs font-normal text-sub">{place.region}</span>}
        </p>
        <span className="flex shrink-0 gap-1 text-[11px]">
          {links.custom && (
            <a href={links.custom} target="_blank" rel="noreferrer" className="rounded bg-canvas px-1.5 py-0.5 text-sub">
              지도
            </a>
          )}
          <a href={links.kakao} target="_blank" rel="noreferrer" className="rounded bg-canvas px-1.5 py-0.5 text-sub">
            카카오맵
          </a>
          <a href={links.naver} target="_blank" rel="noreferrer" className="rounded bg-canvas px-1.5 py-0.5 text-sub">
            네이버
          </a>
        </span>
      </div>
      {!compact && (
        <>
          {place.description && <p className="mt-1 text-sm">{place.description}</p>}
          {price ? (
            <p className="mt-0.5 text-xs text-sub">
              {price}
              {basis && ` (${basis})`}
            </p>
          ) : (
            place.ai_summary?.free && <p className="mt-0.5 text-xs text-sub">무료</p>
          )}
          <AiSummary place={place} />
        </>
      )}
    </div>
  );
}
