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
