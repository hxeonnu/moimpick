import { Suspense } from "react";
import MeetingView from "./MeetingView";

// 모임 화면. DB와 쿠키는 요청마다 읽어야 하므로 Suspense 안에서 불러온다.
export default function MeetingPage({ params, searchParams }) {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sub">불러오는 중…</p>}>
      <MeetingView params={params} searchParams={searchParams} />
    </Suspense>
  );
}
