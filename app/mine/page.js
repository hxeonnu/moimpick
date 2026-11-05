import { Suspense } from "react";
import MyMeetings from "@/components/MyMeetings";

export const metadata = { title: "내가 만든 모임 · 모임픽" };

// 내가 만든 모임 전체 (진행 중 → 마감 순), 카카오 연결 상태
export default function MinePage({ searchParams }) {
  return (
    <>
      <h1 className="mb-4 text-xl font-bold">👑 내가 만든 모임</h1>
      <Suspense fallback={<p className="py-10 text-center text-sub">불러오는 중…</p>}>
        <MyMeetings searchParams={searchParams} />
      </Suspense>
    </>
  );
}
