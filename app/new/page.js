import CreateForm from "@/components/CreateForm";

export const metadata = { title: "새 모임 만들기 · 모임픽" };

export default function NewMeetingPage() {
  return (
    <>
      <h1 className="mb-4 text-xl font-bold">＋ 새 모임 만들기</h1>
      <CreateForm />
    </>
  );
}
