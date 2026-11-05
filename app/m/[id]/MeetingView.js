import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { loadMeeting, loadMe } from "@/lib/db";
import { getOwnerId, kakaoLoginEnabled } from "@/lib/session";
import { rankDates, rankPlaces, noCommonDate, headcount } from "@/lib/ranking";
import { formatDeadline, timeLeft } from "@/lib/format";
import ShareBox from "@/components/ShareBox";
import NamePicker from "@/components/NamePicker";
import VoteForm from "@/components/VoteForm";
import AddCandidate from "@/components/AddCandidate";
import Participation from "@/components/Participation";
import Results from "@/components/Results";
import FinalResult from "@/components/FinalResult";
import AutoRefresh from "@/components/AutoRefresh";
import AdminPanel from "@/components/AdminPanel";
import { PinNotice, LeaveButton } from "@/components/MyPin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function MeetingView({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  await connection();
  if (!UUID.test(id)) notFound();

  const data = await loadMeeting(id);
  if (!data) notFound();
  const { meeting, participants, candidates, responses } = data;

  // 쿠키의 비밀 키로 나를 찾는다. 모임장은 모임장 쿠키가 모임의 admin_token과 같은지로 안다.
  const store = await cookies();
  const me = await loadMe(id, store.get(`mp_${id}`)?.value);
  const ownerId = await getOwnerId();
  const isOwner = Boolean(ownerId) && meeting.owner_kakao_id === ownerId;
  const isAdmin = store.get(`mpa_${id}`)?.value === meeting.admin_token || isOwner;
  // 화면(클라이언트)에는 이름·투표 여부·잠김 여부만 보낸다. (예산은 순위 계산에만 서버에서 쓴다)
  const people = participants.map(({ id, name, voted_at, absent, claimed }) => ({ id, name, voted_at, absent, claimed }));
  const count = headcount(participants);

  const now = new Date();
  const closed = new Date(meeting.deadline) <= now;
  const left = timeLeft(meeting.deadline, now);
  const dateRanks = rankDates(candidates, participants, responses);
  const placeRanks = rankPlaces(candidates, participants, responses);
  const canSeeRanks = closed || Boolean(me?.voted_at);
  const summarizing = candidates.some((c) => c.ai_status === "pending");

  // 내 기존 응답과, 내가 투표한 뒤에 새로 올라온 후보(NEW)
  const myAnswers = Object.fromEntries(
    responses.filter((r) => r.participant_id === me?.id).map((r) => [r.candidate_id, r.value]),
  );
  const isNewForMe = (c) =>
    Boolean(me?.voted_at) && !myAnswers[c.id] && new Date(c.created_at) > new Date(me.voted_at);

  return (
    <div className="space-y-4">
      <header>
        <span className="inline-block rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-ink">
          {meeting.round > 1 && `🔁 ${meeting.round}차 재투표 · `}
          {closed ? "투표 마감" : `마감까지 ${left}`} · {formatDeadline(meeting.deadline)}
        </span>
        <h1 className="mt-2 text-2xl font-bold">{meeting.title}</h1>
        <div className="mt-1 text-sm text-sub">
          {participants.length}명 참여
          {me && !closed && (
            <>
              {" · "}
              <strong className="text-ink">{me.name}</strong>(으)로 투표 중 · 내 번호 <strong className="text-ink">{me.pin}</strong>{" "}
              <LeaveButton meetingId={id} pin={me.pin} />
            </>
          )}
        </div>
      </header>

      {/* 마감 뒤에는 투표 링크 대신 아래 확정 결과에서 결과를 공유한다. */}
      {!closed && <ShareBox meetingId={id} title={meeting.title} deadline={formatDeadline(meeting.deadline)} highlight={sp?.new === "1"} />}
      {me && !closed && sp?.welcome === "1" && <PinNotice pin={me.pin} />}

      {closed ? (
        <FinalResult meeting={meeting} dateRanks={dateRanks} placeRanks={placeRanks} count={count} isAdmin={isAdmin} />
      ) : !me ? (
        <NamePicker meetingId={id} title={meeting.title} participants={people} />
      ) : (
        <>
          <VoteForm
            meetingId={id}
            mode={meeting.mode}
            round={meeting.round}
            budget={me.budget}
            voted={Boolean(me.voted_at)}
            absent={me.absent}
            dates={candidates.filter((c) => c.kind === "date").map((c) => ({ ...c, mine: myAnswers[c.id] || null, isNew: isNewForMe(c) }))}
            places={candidates.filter((c) => c.kind === "place").map((c) => ({ ...c, mine: myAnswers[c.id] || null, isNew: isNewForMe(c) }))}
          />
          {/* 재투표는 동점이었던 후보로만 하므로 후보 추가를 막는다. */}
          {meeting.round === 1 && <AddCandidate meetingId={id} mode={meeting.mode} />}
        </>
      )}

      <Participation meetingId={id} participants={people} closed={closed} />
      {isAdmin && (
        <AdminPanel
          meetingId={id}
          meetingTitle={meeting.title}
          kakao={kakaoLoginEnabled() ? (isOwner ? "mine" : meeting.owner_kakao_id ? "other" : "none") : "off"}
          adminToken={meeting.admin_token}
          participants={people}
          closed={closed}
        />
      )}

      {canSeeRanks ? (
        <>
          <Results
            mode={meeting.mode}
            dateRanks={dateRanks}
            placeRanks={placeRanks}
            noCommon={noCommonDate(dateRanks, participants)}
            count={count}
            closed={closed}
          />
          {!closed && <AutoRefresh seconds={5} />}
        </>
      ) : (
        <>
          <p className="rounded-2xl bg-white p-4 text-center text-sm text-sub">🔒 투표하면 지금 순위를 볼 수 있어요</p>
          {/* AI 요약이 만들어지는 중이면 투표 전이라도 화면을 새로 받아서 요약이 뜨게 한다. */}
          {summarizing && <AutoRefresh seconds={4} />}
        </>
      )}
    </div>
  );
}
