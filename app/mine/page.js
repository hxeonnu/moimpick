import { Suspense } from "react";
import MyMeetings from "@/components/MyMeetings";
import { Skeleton } from "@/components/Feedback";

export const metadata = { title: "내가 만든 모임 · 모임픽" };

// 내가 만든 모임 전체 (진행 중 → 마감 순), 카카오 연결 상태
export default function MinePage({ searchParams }) {
  return (
    <>
      <h1 className="mb-4 text-xl font-bold">👑 내가 만든 모임</h1>
      <Suspense fallback={<Skeleton blocks={[200, 110]} />}>
        <MyMeetings searchParams={searchParams} />
      </Suspense>
    </>
  );
}
