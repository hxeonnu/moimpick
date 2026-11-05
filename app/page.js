import { Suspense } from "react";
import HomeSections from "@/components/HomeSections";

// 첫 화면: 진행 중인 모임 / 내가 만든 모임 / 새 모임 만들기
export default function Home() {
  return (
    <>
      <p className="mb-4 text-sm text-sub">링크 하나로 날짜와 장소를 함께 정하는 약속 조율 서비스</p>
      {/* 이 기기의 모임 쿠키는 요청마다 읽어야 해서 Suspense 안에서 불러온다. */}
      <Suspense fallback={<p className="py-10 text-center text-sub">불러오는 중…</p>}>
        <HomeSections />
      </Suspense>
    </>
  );
}
