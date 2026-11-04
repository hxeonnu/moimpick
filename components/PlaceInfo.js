import { mapLinks, priceRange } from "@/lib/format";

// 장소 후보의 이름·설명·가격·지도 링크. 투표 화면과 결과 화면이 같이 쓴다.
export default function PlaceInfo({ place, compact = false }) {
  const links = mapLinks(place);
  const price = priceRange(place);
  const summary = place.ai_summary;

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
          {summary?.oneLine && (
            <p className="mt-1.5 rounded-lg bg-[#f7f7fe] px-2.5 py-2 text-xs leading-relaxed">
              <span className="font-semibold text-brand-ink">✨ AI 요약</span> {summary.oneLine}
            </p>
          )}
          {place.description && <p className="mt-1 text-sm">{place.description}</p>}
          {price && <p className="mt-0.5 text-xs text-sub">{price} (사이드·주류 제외)</p>}
        </>
      )}
    </div>
  );
}
