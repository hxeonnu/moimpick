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

// 모임 하나와 그에 딸린 참여자·후보·응답을 한 번에 읽는다.
export async function loadMeeting(id) {
  const { data: meeting, error } = await db().from("meetings").select("*").eq("id", id).maybeSingle();
  if (error || !meeting) return null;

  const [participants, candidates] = await Promise.all([
    db().from("participants").select("*").eq("meeting_id", id).order("created_at"),
    db().from("candidates").select("*").eq("meeting_id", id).order("created_at"),
  ]);

  const candidateIds = (candidates.data || []).map((c) => c.id);
  const responses = candidateIds.length
    ? await db().from("responses").select("*").in("candidate_id", candidateIds)
    : { data: [] };

  return {
    meeting,
    participants: participants.data || [],
    candidates: candidates.data || [],
    responses: responses.data || [],
  };
}
