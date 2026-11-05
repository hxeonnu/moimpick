import { connection } from "next/server";
import { loadMeetingSummaries } from "@/lib/db";
import { getOwnerId, kakaoLoginEnabled, readMyCookies } from "@/lib/session";
import { logoutOwner } from "@/app/actions";
import MeetingRow from "./MeetingRow";
import KakaoPrivacyNote from "./KakaoPrivacyNote";

// "내가 만든 모임" 화면. 가입 없이 이 기기의 모임장 쿠키(mpa_모임id)로 찾고,
// 카카오로 연결했다면 그 계정에 묶인 모임도 합친다. (쿠키가 지워지거나 다른 폰이어도 카카오 로그인만 하면 찾을 수 있음)
export default async function MyMeetings({ searchParams }) {
  await connection();
  const kakaoResult = (await searchParams)?.kakao;
  const { hosted } = await readMyCookies();
  const ownerId = await getOwnerId();
  const meetings = await loadMeetingSummaries(hosted, ownerId);
  const kakaoOn = kakaoLoginEnabled();
  const now = new Date();
  const notice =
    kakaoResult === "ok" ? "카카오로 연결했어요." : kakaoResult === "fail" ? "카카오 연결에 실패했어요. 잠시 뒤 다시 해 주세요." : null;

  return (
    <div className="space-y-4">
      {notice && <p className="rounded-xl bg-brand-soft px-3 py-2 text-sm text-brand-ink">{notice}</p>}
      <section className="rounded-2xl bg-white p-4">
        {meetings.length ? (
          <ul className="divide-y divide-line">
            {meetings.map((m) => (
              <MeetingRow key={m.id} m={m} now={now} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-sub">아직 이 기기에서 만든 모임이 없어요.</p>
        )}
      </section>

      <section className="rounded-2xl bg-white p-4 text-sm">
        {ownerId ? (
          <div className="flex items-center justify-between gap-2">
            <span>✅ 카카오에 연결됨. 다른 기기에서도 이 목록이 보여요.</span>
            <form action={logoutOwner}>
              <button className="shrink-0 text-xs text-sub underline">연결 끊기</button>
            </form>
          </div>
        ) : kakaoOn ? (
          <>
            <p className="text-sub">이 기기에서 만든 모임만 보여요. 카카오로 연결하면 다른 기기나 기록이 지워진 뒤에도 다시 찾을 수 있어요.</p>
            <a href="/auth/kakao?next=/mine" className="mt-2 block rounded-xl bg-[#FEE500] py-2.5 text-center font-semibold text-[#191919]">
              카카오로 연결하기 / 다른 기기의 모임 불러오기
            </a>
          </>
        ) : (
          <p className="text-sub">이 기기에서 만든 모임만 보여요. 다른 기기에서는 모임장 링크로 들어가면 여기에도 보여요.</p>
        )}
        {kakaoOn && <KakaoPrivacyNote className="mt-3 border-t border-line pt-2" />}
      </section>
    </div>
  );
}
