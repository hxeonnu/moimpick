import { Suspense } from "react";
import CreateForm from "@/components/CreateForm";
import MyMeetings from "@/components/MyMeetings";
import Logo from "@/components/Logo";

export default function Home({ searchParams }) {
  return (
    <>
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Logo size={32} />
          모임픽
        </h1>
        <p className="mt-1 text-sm text-sub">링크 하나로 날짜와 장소를 함께 정하는 약속 조율 서비스</p>
      </header>
      {/* 모임장 쿠키는 요청마다 읽어야 해서 Suspense 안에서 불러온다. 없으면 아무것도 안 보임 */}
      <Suspense fallback={null}>
        <MyMeetings searchParams={searchParams} />
      </Suspense>
      <CreateForm />
    </>
  );
}
