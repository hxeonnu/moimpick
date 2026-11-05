import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { formatDeadline } from "@/lib/format";
import { OgCard, OG_SIZE, ogFonts } from "@/lib/og";

// 모임마다 다른 링크 미리보기 이미지: 단톡방에 링크만 올려도 어떤 모임인지, 언제 마감인지 카드에서 바로 보인다.
export const alt = "모임픽 투표";
export const size = OG_SIZE;
export const contentType = "image/png";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Image({ params }) {
  const { id } = await params;
  const { data: m } = UUID.test(id)
    ? await db().from("meetings").select("title, deadline").eq("id", id).maybeSingle()
    : { data: null };
  const title = m?.title || "모임픽 투표";
  const closed = m && new Date(m.deadline) <= new Date();
  // 긴 모임 이름은 줄이고, 글자 크기도 줄인다.
  const shown = title.length > 24 ? `${title.slice(0, 23)}…` : title;
  const titleSize = shown.length > 14 ? 72 : 96;

  return new ImageResponse(
    <OgCard
      title={shown}
      titleSize={titleSize}
      subtitle={closed ? "투표가 마감됐어요 · 결과를 확인해 보세요" : "날짜·장소 투표에 참여해 주세요"}
      badge={m ? (closed ? "투표 마감" : `마감 ${formatDeadline(m.deadline)}`) : null}
    />,
    { ...size, fonts: await ogFonts() },
  );
}
