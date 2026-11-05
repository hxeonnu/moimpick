import Link from "next/link";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { loadMeetingSummaries } from "@/lib/db";
import { getOwnerId, kakaoLoginEnabled } from "@/lib/session";
import { logoutOwner } from "@/app/actions";
import { timeLeft } from "@/lib/format";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 첫 화면의 "내가 만든 모임". 가입 없이, 이 기기에 남은 모임장 쿠키(mpa_모임id)로 찾고,
// 카카오로 연결했다면 그 계정에 묶인 모임도 합쳐서 보여 준다. (쿠키가 지워지거나 다른 폰이어도 카카오 로그인만 하면 찾을 수 있음)
export default async function MyMeetings({ searchParams }) {
  await connection();
  const kakaoResult = (await searchParams)?.kakao;
  const store = await cookies();
  const mine = store
    .getAll()
    .filter((c) => c.name.startsWith("mpa_") && UUID.test(c.name.slice(4)))
    .map((c) => ({ id: c.name.slice(4), token: c.value }));
  const ownerId = await getOwnerId();
  const meetings = await loadMeetingSummaries(mine, ownerId);
  const kakaoOn = kakaoLoginEnabled();
  const notice =
    kakaoResult === "ok" ? "카카오로 연결했어요." : kakaoResult === "fail" ? "카카오 연결에 실패했어요. 잠시 뒤 다시 해 주세요." : null;

  // 만든 모임이 없으면, 다른 기기에서 만든 모임을 불러오는 버튼만 작게 보여 준다.
  if (!meetings.length) {
    if (!kakaoOn || ownerId) return notice ? <p className="mb-4 text-center text-xs text-sub">{notice}</p> : null;
    return (
      <a href="/auth/kakao?next=/" className="mb-4 block text-center text-xs text-sub underline">
        다른 기기에서 만든 모임이 있나요? 카카오로 불러오기
      </a>
    );
  }

  const now = new Date();
  return (
    <section className="mb-5 rounded-2xl bg-white p-4">
      <h2 className="text-sm font-bold">👑 내가 만든 모임</h2>
      <ul className="mt-2 divide-y divide-line">
        {meetings.map((m) => {
          const closed = new Date(m.deadline) <= now;
          return (
            <li key={m.id}>
              <Link href={`/m/${m.id}`} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{m.title}</span>
                  <span className="text-xs text-sub">
                    {m.round > 1 && `🔁 ${m.round}차 · `}
                    {closed ? "마감됨 · 결과 보기" : `마감까지 ${timeLeft(m.deadline, now)} · 응답 ${m.responded}/${m.total}`}
                  </span>
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${closed ? "bg-canvas text-sub" : "bg-brand-soft text-brand-ink"}`}>
                  {closed ? "마감" : "진행 중"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {notice && <p className="mt-2 text-xs font-semibold text-brand-ink">{notice}</p>}
      {ownerId ? (
        <div className="mt-2 flex items-center justify-between text-[11px] text-sub">
          <span>✅ 카카오에 연결됨. 다른 기기에서도 이 목록이 보여요.</span>
          <form action={logoutOwner}>
            <button className="underline">연결 끊기</button>
          </form>
        </div>
      ) : (
        <div className="mt-2 text-[11px] text-sub">
          이 기기에서 만든 모임이에요.{" "}
          {kakaoOn ? (
            <a href="/auth/kakao?next=/" className="font-semibold text-brand-ink underline">
              카카오로 연결하면 다른 기기에서도 보여요
            </a>
          ) : (
            "다른 기기에서는 모임장 링크로 들어가면 여기에도 보여요."
          )}
        </div>
      )}
    </section>
  );
}
