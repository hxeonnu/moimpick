// 순위 계산. 화면과 서버 어디서든 쓸 수 있도록 DB를 부르지 않는 순수 함수로 둔다.
//
// 한 사람이 한 후보에 대해 가질 수 있는 상태
//   답함      : responses에 값이 있음
//   아직 모름 : 투표는 했는데, 이 후보가 그 뒤에 추가돼서 본 적이 없음
//   미응답    : 아직 투표 자체를 안 함
// "아직 모름"과 "미응답"은 점수에 넣지 않는다.

function statusOf(participant, candidate, answer) {
  if (answer) return answer.value;
  if (!participant.voted_at) return "notVoted";
  if (new Date(candidate.created_at) > new Date(participant.voted_at)) return "unseen";
  // 봤는데 답이 없으면: 날짜는 안 됨, 장소는 보통으로 본다.
  return candidate.kind === "date" ? "no" : "neutral";
}

function answersFor(candidate, participants, responses) {
  const byParticipant = new Map(
    responses.filter((r) => r.candidate_id === candidate.id).map((r) => [r.participant_id, r]),
  );
  return participants.map((p) => ({ participant: p, status: statusOf(p, candidate, byParticipant.get(p.id)) }));
}

export function rankDates(candidates, participants, responses) {
  return candidates
    .filter((c) => c.kind === "date")
    .map((c) => {
      const answers = answersFor(c, participants, responses);
      const pick = (s) => answers.filter((a) => a.status === s).map((a) => a.participant.name);
      return {
        candidate: c,
        yes: pick("yes"),
        no: pick("no"),
        unknown: [...pick("unseen"), ...pick("notVoted")],
      };
    })
    .sort((a, b) => b.yes.length - a.yes.length || a.no.length - b.no.length);
}

export function rankPlaces(candidates, participants, responses) {
  return candidates
    .filter((c) => c.kind === "place")
    .map((c) => {
      const answers = answersFor(c, participants, responses);
      const count = (s) => answers.filter((a) => a.status === s).length;
      const good = count("good");
      const neutral = count("neutral");
      const bad = count("bad");
      // 예산 초과: 예산을 적은 사람 중 가장 싼 대표 메뉴도 예산보다 비싼 경우 (인원수만 보여 준다)
      const overBudget = c.price_min
        ? participants.filter((p) => p.budget != null && p.budget < c.price_min).length
        : 0;
      return {
        candidate: c,
        good,
        neutral,
        bad,
        score: good - bad,
        overBudget,
        unknown: count("unseen") + count("notVoted"),
      };
    })
    .sort((a, b) => b.score - a.score || a.overBudget - b.overBudget || b.good - a.good);
}

// 모두 되는 날짜가 없을 때 보여 줄 안내 (사람을 빼지 않고 누가 안 되는지만 보여 준다)
export function noCommonDate(dateRanks, participants) {
  if (!dateRanks.length) return null;
  const everyoneVoted = participants.length > 0 && participants.every((p) => p.voted_at);
  const allYes = dateRanks.some((d) => d.yes.length === participants.length);
  if (!everyoneVoted || allYes) return null;
  return dateRanks.slice(0, 2).map((d) => ({ label: d.candidate.label, cannot: d.no }));
}
