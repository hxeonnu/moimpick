import { Suspense } from "react";
import { db } from "@/lib/db";
import { formatDeadline } from "@/lib/format";
import MeetingView from "./MeetingView";
import { Skeleton } from "@/components/Feedback";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 카톡에 링크를 올리면 카드 제목·설명이 "모임 이름 · 모임픽 / 투표에 참여해 주세요 · 마감 …"으로 보이게 한다.
// (카드 이미지는 같은 폴더의 opengraph-image.js가 만든다)
export async function generateMetadata({ params }) {
  const { id } = await params;
  const { data: m } = UUID.test(id) ? await db().from("meetings").select("title, deadline").eq("id", id).maybeSingle() : { data: null };
  if (!m) return { title: "모임픽" };
  const closed = new Date(m.deadline) <= new Date();
  const title = `${m.title} · 모임픽`;
  const description = closed ? "투표가 마감됐어요 · 결과를 확인해 보세요" : `날짜·장소 투표에 참여해 주세요 · 마감 ${formatDeadline(m.deadline)}`;
  return { title, description, openGraph: { title, description } };
}

// 모임 화면. DB와 쿠키는 요청마다 읽어야 하므로 Suspense 안에서 불러온다.
export default function MeetingPage({ params, searchParams }) {
  return (
    <Suspense fallback={<Skeleton blocks={[72, 150, 320, 140]} />}>
      <MeetingView params={params} searchParams={searchParams} />
    </Suspense>
  );
}
