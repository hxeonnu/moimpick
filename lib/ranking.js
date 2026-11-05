// 순위 계산. 화면과 서버 어디서든 쓸 수 있도록 DB를 부르지 않는 순수 함수로 둔다.
//
// 순위는 "참석으로 응답한 사람"만 가지고 계산한다. 사람이 많으면 끝까지 링크를 안 여는 사람이 꼭 있어서,
// 그 사람들 때문에 결과가 틀어지지 않게 한다.
//   참석   : 투표함 (voted_at 있음, absent 아님)
//   불참   : 본인이 "이번엔 불참"을 누름 → 계산에서 빠짐
//   무응답 : 아직 투표 안 함 → 계산에서 빠지고 숫자로만 보여 줌
//
// 참석자가 한 후보에 대해 가질 수 있는 상태
//   답함      : responses에 값이 있음
//   아직 모름 : 투표한 뒤에 이 후보가 추가돼서 본 적이 없음 → 점수에 넣지 않는다.

export const isAttending = (p) => Boolean(p.voted_at) && !p.absent;

export function headcount(participants) {
  const attending = participants.filter(isAttending).length;
  const absent = participants.filter((p) => p.absent).length;
  return { attending, absent, noResponse: participants.length - attending - absent, total: participants.length };
}

function statusOf(participant, candidate, answer) {
  if (answer) return answer.value;
  if (new Date(candidate.created_at) > new Date(participant.voted_at)) return "unseen";
  // 봤는데 답이 없으면: 날짜는 안 됨, 장소는 보통으로 본다.
  return candidate.kind === "date" ? "no" : "neutral";
}

function answersFor(candidate, participants, responses) {
  const byParticipant = new Map(
    responses.filter((r) => r.candidate_id === candidate.id).map((r) => [r.participant_id, r]),
  );
  return participants.filter(isAttending).map((p) => ({ participant: p, status: statusOf(p, candidate, byParticipant.get(p.id)) }));
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
        unknown: pick("unseen"),
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
      // 예산 초과: 예산을 적은 참석자 중 가장 싼 대표 메뉴도 예산보다 비싼 경우 (인원수만 보여 준다)
      const overBudget = c.price_min
        ? participants.filter((p) => isAttending(p) && p.budget != null && p.budget < c.price_min).length
        : 0;
      return {
        candidate: c,
        good,
        neutral,
        bad,
        score: good - bad,
        overBudget,
        unknown: count("unseen"),
      };
    })
    .sort((a, b) => b.score - a.score || a.overBudget - b.overBudget || b.good - a.good);
}

// 참석자 모두 되는 날짜가 없을 때 보여 줄 안내 (사람을 빼지 않고 누가 안 되는지만 보여 준다)
export function noCommonDate(dateRanks, participants) {
  const attending = participants.filter(isAttending).length;
  if (!dateRanks.length || !attending) return null;
  const allYes = dateRanks.some((d) => d.yes.length === attending);
  if (allYes) return null;
  return dateRanks.slice(0, 2).map((d) => ({ label: d.candidate.label, cannot: d.no }));
}

// 마감 후 확정. 1위가 하나면 그대로, 동점이면 모임장이 고른 후보로 정한다. 아직 안 골랐으면 동점 목록만 돌려준다.
export const dateKey = (d) => d.yes.length;
export const placeKey = (p) => `${p.score}/${p.overBudget}`;

export function decide(ranks, key, pickedId) {
  if (!ranks.length) return { none: true, tied: [] };
  const best = key(ranks[0]);
  const tied = ranks.filter((r) => key(r) === best);
  const picked = pickedId ? ranks.find((r) => r.candidate.id === pickedId) : null;
  if (picked) return { winner: picked, picked: true, tied };
  return tied.length === 1 ? { winner: tied[0], tied } : { tied };
}
