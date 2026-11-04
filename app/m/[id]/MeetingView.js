import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { loadMeeting } from "@/lib/db";
import { rankDates, rankPlaces, noCommonDate } from "@/lib/ranking";
import { formatDeadline, timeLeft } from "@/lib/format";
import ShareBox from "@/components/ShareBox";
import NamePicker from "@/components/NamePicker";
import VoteForm from "@/components/VoteForm";
import AddCandidate from "@/components/AddCandidate";
import Participation from "@/components/Participation";
import Results from "@/components/Results";
import FinalResult from "@/components/FinalResult";
import AutoRefresh from "@/components/AutoRefresh";
import { forgetParticipant } from "@/app/actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function MeetingView({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  await connection();
  if (!UUID.test(id)) notFound();

  const data = await loadMeeting(id);
  if (!data) notFound();
  const { meeting, participants, candidates, responses } = data;

  const store = await cookies();
  const me = participants.find((p) => p.id === store.get(`mp_${id}`)?.value) || null;

  const now = new Date();
  const closed = new Date(meeting.deadline) <= now;
  const left = timeLeft(meeting.deadline, now);
  const dateRanks = rankDates(candidates, participants, responses);
  const placeRanks = rankPlaces(candidates, participants, responses);
  const canSeeRanks = closed || Boolean(me?.voted_at);

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
          {closed ? "투표 마감" : `마감까지 ${left}`} · {formatDeadline(meeting.deadline)}
        </span>
        <h1 className="mt-2 text-2xl font-bold">{meeting.title}</h1>
        <div className="mt-1 text-sm text-sub">
          {participants.length}명 참여
          {me && !closed && (
            <>
              {" · "}
              <strong className="text-ink">{me.name}</strong>로 투표 중{" "}
              <form action={forgetParticipant.bind(null, id)} className="inline">
                <button className="underline">다른 이름</button>
              </form>
            </>
          )}
        </div>
      </header>

      <ShareBox meetingId={id} title={meeting.title} highlight={sp?.new === "1"} />

      {closed ? (
        <FinalResult mode={meeting.mode} dateRanks={dateRanks} placeRanks={placeRanks} />
      ) : !me ? (
        <NamePicker meetingId={id} participants={participants} />
      ) : (
        <>
          <VoteForm
            meetingId={id}
            mode={meeting.mode}
            budget={me.budget}
            voted={Boolean(me.voted_at)}
            dates={candidates.filter((c) => c.kind === "date").map((c) => ({ ...c, mine: myAnswers[c.id] || null, isNew: isNewForMe(c) }))}
            places={candidates.filter((c) => c.kind === "place").map((c) => ({ ...c, mine: myAnswers[c.id] || null, isNew: isNewForMe(c) }))}
          />
          <AddCandidate meetingId={id} mode={meeting.mode} />
        </>
      )}

      <Participation meetingId={id} participants={participants} closed={closed} />

      {canSeeRanks ? (
        <>
          <Results
            mode={meeting.mode}
            dateRanks={dateRanks}
            placeRanks={placeRanks}
            noCommon={noCommonDate(dateRanks, participants)}
            total={participants.length}
          />
          {!closed && <AutoRefresh seconds={5} />}
        </>
      ) : (
        <p className="rounded-2xl bg-white p-4 text-center text-sm text-sub">🔒 투표하면 지금 순위를 볼 수 있어요</p>
      )}
    </div>
  );
}
