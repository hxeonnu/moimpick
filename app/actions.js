"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { after } from "next/server";
import { db } from "@/lib/db";
import { summarizePlace, aiEnabled } from "@/lib/gemini";

// 장소가 추가되면 응답을 먼저 보내고, AI 요약은 뒤에서 만든다. (10초 넘게 걸려서)
const aiStatus = () => (aiEnabled() ? "pending" : "none");
function summarizeLater(ids) {
  if (!aiEnabled() || !ids.length) return;
  after(async () => {
    for (const id of ids) await summarizePlace(id);
  });
}

// 로그인이 없으므로, 명단에서 고른 이름을 이 브라우저 쿠키에 기억해 둔다.
const cookieName = (meetingId) => `mp_${meetingId}`;
const lines = (text) =>
  String(text || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
const toInt = (v) => {
  const n = parseInt(String(v || "").replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

async function currentParticipant(meetingId) {
  const store = await cookies();
  const id = store.get(cookieName(meetingId))?.value;
  if (!id) return null;
  const { data } = await db().from("participants").select("*").eq("id", id).eq("meeting_id", meetingId).maybeSingle();
  return data;
}

async function openMeeting(meetingId) {
  const { data } = await db().from("meetings").select("*").eq("id", meetingId).maybeSingle();
  if (!data) return { error: "모임을 찾을 수 없어요." };
  if (new Date(data.deadline) <= new Date()) return { error: "투표가 이미 마감됐어요." };
  return { meeting: data };
}

// 1. 모임 만들기
export async function createMeeting(prevState, formData) {
  const title = String(formData.get("title") || "").trim();
  const mode = String(formData.get("mode") || "both");
  const deadlineLocal = String(formData.get("deadline") || "");
  const names = [...new Set(lines(formData.get("names")))];
  const dates = lines(formData.get("dates"));
  const places = lines(formData.get("places"));

  if (!title) return { error: "모임 이름을 적어 주세요." };
  if (!deadlineLocal) return { error: "투표 마감 시간을 정해 주세요." };
  // 입력한 시간은 한국 시간으로 본다.
  const deadline = new Date(`${deadlineLocal}:00+09:00`);
  if (Number.isNaN(deadline.getTime()) || deadline <= new Date()) return { error: "마감 시간은 지금보다 뒤여야 해요." };
  if (names.length < 2) return { error: "참여자 이름을 두 명 이상 한 줄에 한 명씩 적어 주세요." };

  const { data: meeting, error } = await db()
    .from("meetings")
    .insert({ title, mode, deadline: deadline.toISOString() })
    .select("id")
    .single();
  if (error) return { error: "모임을 만들지 못했어요. 잠시 뒤 다시 시도해 주세요." };

  await db().from("participants").insert(names.map((name) => ({ meeting_id: meeting.id, name })));

  const initial = [
    ...(mode !== "place" ? dates.map((label) => ({ meeting_id: meeting.id, kind: "date", label })) : []),
    ...(mode !== "date" ? places.map((label) => ({ meeting_id: meeting.id, kind: "place", label, ai_status: aiStatus() })) : []),
  ];
  if (initial.length) {
    const { data: inserted } = await db().from("candidates").insert(initial).select("id, kind");
    summarizeLater((inserted || []).filter((c) => c.kind === "place").map((c) => c.id));
  }

  redirect(`/m/${meeting.id}?new=1`);
}

// 2. 명단에서 내 이름 고르기
export async function chooseParticipant(meetingId, participantId) {
  const { data } = await db()
    .from("participants")
    .select("id")
    .eq("id", participantId)
    .eq("meeting_id", meetingId)
    .maybeSingle();
  if (!data) return;
  const store = await cookies();
  store.set(cookieName(meetingId), participantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 60,
    path: "/",
  });
  refresh();
}

export async function forgetParticipant(meetingId) {
  const store = await cookies();
  store.delete(cookieName(meetingId));
  refresh();
}

// 3. 투표 (처음 투표와 수정 모두)
export async function submitVote(meetingId, prevState, formData) {
  const open = await openMeeting(meetingId);
  if (open.error) return { error: open.error };
  const me = await currentParticipant(meetingId);
  if (!me) return { error: "명단에서 이름을 먼저 골라 주세요." };

  // 화면에 보였던 후보에만 답을 저장한다. (투표하는 사이 새로 추가된 후보는 "아직 모름"으로 남김)
  const shown = formData.getAll("shown").map(String);
  const { data: candidates } = await db().from("candidates").select("id, kind").eq("meeting_id", meetingId).in("id", shown.length ? shown : ["00000000-0000-0000-0000-000000000000"]);

  const now = new Date().toISOString();
  const rows = (candidates || []).map((c) => {
    if (c.kind === "date") {
      return { participant_id: me.id, candidate_id: c.id, value: formData.get(`d_${c.id}`) ? "yes" : "no", updated_at: now };
    }
    const v = String(formData.get(`p_${c.id}`) || "neutral");
    return { participant_id: me.id, candidate_id: c.id, value: ["good", "neutral", "bad"].includes(v) ? v : "neutral", updated_at: now };
  });
  if (rows.length) {
    const { error } = await db().from("responses").upsert(rows, { onConflict: "participant_id,candidate_id" });
    if (error) return { error: "저장하지 못했어요. 다시 시도해 주세요." };
  }

  await db()
    .from("participants")
    .update({ budget: toInt(formData.get("budget")), voted_at: me.voted_at || now })
    .eq("id", me.id);

  refresh();
  return { ok: true, at: now };
}

// 4. 후보 추가 (누구나)
export async function addCandidate(meetingId, prevState, formData) {
  const open = await openMeeting(meetingId);
  if (open.error) return { error: open.error };
  const me = await currentParticipant(meetingId);
  if (!me) return { error: "명단에서 이름을 먼저 골라 주세요." };

  const kind = formData.get("kind") === "place" ? "place" : "date";
  const label = String(formData.get("label") || "").trim();
  if (!label) return { error: kind === "date" ? "날짜를 적어 주세요." : "가게 이름을 적어 주세요." };

  const row = { meeting_id: meetingId, kind, label, added_by: me.id };
  if (kind === "place") {
    const price = toInt(formData.get("price"));
    const mapUrl = String(formData.get("map_url") || "").trim();
    Object.assign(row, {
      region: String(formData.get("region") || "").trim() || null,
      description: String(formData.get("description") || "").trim() || null,
      price_min: price,
      price_max: price,
      map_url: /^https?:\/\//.test(mapUrl) ? mapUrl : null,
      ai_status: aiStatus(),
    });
  }

  const { data: inserted, error } = await db().from("candidates").insert(row).select("id").single();
  if (error) return { error: "후보를 추가하지 못했어요." };
  if (kind === "place") summarizeLater([inserted.id]);

  refresh();
  return { ok: true, label, kind, at: new Date().toISOString() };
}
