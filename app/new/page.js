import CreateForm from "@/components/CreateForm";
import { KEEP_DAYS } from "@/lib/format";

export const metadata = { title: "새 모임 만들기 · 모임픽" };

export default function NewMeetingPage() {
  return (
    <>
      <h1 className="mb-4 text-xl font-bold">＋ 새 모임 만들기</h1>
      <CreateForm />
      <p className="mt-3 text-center text-xs text-sub">
        🔒 모임은 마감 {KEEP_DAYS}일 뒤 참여자 이름·후보·투표와 함께 자동으로 지워져요.
      </p>
    </>
  );
}
