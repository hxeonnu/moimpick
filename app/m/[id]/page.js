import { Suspense } from "react";
import MeetingView from "./MeetingView";
import { Skeleton } from "@/components/Feedback";

// 모임 화면. DB와 쿠키는 요청마다 읽어야 하므로 Suspense 안에서 불러온다.
export default function MeetingPage({ params, searchParams }) {
  return (
    <Suspense fallback={<Skeleton blocks={[72, 150, 320, 140]} />}>
      <MeetingView params={params} searchParams={searchParams} />
    </Suspense>
  );
}
