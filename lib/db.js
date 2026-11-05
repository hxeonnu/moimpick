import "server-only";
import { createClient } from "@supabase/supabase-js";

// 비밀 키는 서버에서만 쓴다. 이 파일을 화면(클라이언트) 코드에서 불러오면 빌드가 막힌다.
let client;

export function db() {
  if (!client) {
    client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }
  return client;
}

// 참여자의 비밀 키와 번호는 화면으로 절대 보내지 않는다. 대신 "누가 이미 골랐는지"만 claimed로 알려 준다.
const PUBLIC_PARTICIPANT = "id, meeting_id, name, budget, voted_at, absent, created_at, claim_token";
const toPublic = ({ claim_token, ...p }) => ({ ...p, claimed: Boolean(claim_token) });

// 쿠키의 비밀 키로 "나"를 찾는다. 내 번호(pin)는 내 화면에만 보여 준다.
export async function loadMe(meetingId, token) {
  if (!token) return null;
  const { data } = await db()
    .from("participants")
    .select("id, name, budget, voted_at, absent, pin")
    .eq("meeting_id", meetingId)
    .eq("claim_token", token)
    .maybeSingle();
  return data;
}

// 모임 하나와 그에 딸린 참여자·후보·응답을 한 번에 읽는다.
export async function loadMeeting(id) {
  const { data: meeting, error } = await db().from("meetings").select("*").eq("id", id).maybeSingle();
  if (error || !meeting) return null;

  const [participants, candidates] = await Promise.all([
    // 명단은 한 번에 넣어서 만든 시각이 같으므로, 이름순으로 한 번 더 정렬해 순서가 바뀌지 않게 한다.
    db().from("participants").select(PUBLIC_PARTICIPANT).eq("meeting_id", id).order("created_at").order("name"),
    // 동점 재투표에서 빠진 후보는 화면과 계산에서 뺀다.
    db().from("candidates").select("*").eq("meeting_id", id).eq("dropped", false).order("created_at"),
  ]);

  const candidateIds = (candidates.data || []).map((c) => c.id);
  const responses = candidateIds.length
    ? await db().from("responses").select("*").in("candidate_id", candidateIds)
    : { data: [] };

  return {
    meeting,
    participants: (participants.data || []).map(toPublic),
    candidates: candidates.data || [],
    responses: responses.data || [],
  };
}

// "내가 만든 모임" 목록. 모임장 쿠키(id + 비밀 키)가 맞는 모임과, 카카오로 연결한 모임을 합쳐 진행 중인 것 먼저 보여 준다.
export async function loadMeetingSummaries(mine, ownerId = null) {
  const tokens = Object.fromEntries(mine.map((m) => [m.id, m.token]));
  const cols = "id, title, deadline, round, admin_token, owner_kakao_id, created_at";
  const [byCookie, byOwner] = await Promise.all([
    mine.length ? db().from("meetings").select(cols).in("id", Object.keys(tokens)) : { data: [] },
    ownerId ? db().from("meetings").select(cols).eq("owner_kakao_id", ownerId) : { data: [] },
  ]);
  const seen = new Set();
  const owned = [...(byCookie.data || []).filter((m) => m.admin_token === tokens[m.id]), ...(byOwner.data || [])].filter(
    (m) => !seen.has(m.id) && seen.add(m.id),
  );
  if (!owned.length) return [];

  const { data: people } = await db()
    .from("participants")
    .select("meeting_id, voted_at, absent")
    .in("meeting_id", owned.map((m) => m.id));
  const now = Date.now();
  return owned
    .map(({ admin_token, owner_kakao_id, ...m }) => {
      const group = (people || []).filter((p) => p.meeting_id === m.id);
      return { ...m, total: group.length, responded: group.filter((p) => p.voted_at || p.absent).length };
    })
    .sort((a, b) => {
      const ao = new Date(a.deadline) > now, bo = new Date(b.deadline) > now;
      if (ao !== bo) return ao ? -1 : 1;
      return ao ? new Date(a.deadline) - new Date(b.deadline) : new Date(b.deadline) - new Date(a.deadline);
    });
}

// 카카오로 연결: 이 기기에서 만든 모임(모임장 쿠키가 맞는 것) 중 아직 아무 계정에도 안 묶인 모임을 이 계정에 묶는다.
export async function linkMeetingsToOwner(ownerId, mine) {
  for (const { id, token } of mine) {
    await db().from("meetings").update({ owner_kakao_id: ownerId }).eq("id", id).eq("admin_token", token).is("owner_kakao_id", null);
  }
}
