"use server";

import { randomBytes, randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { after } from "next/server";
import { db, loadMeeting } from "@/lib/db";
import { rankDates, rankPlaces, decide, dateKey, placeKey } from "@/lib/ranking";
import { summarizePlace, aiEnabled } from "@/lib/gemini";
import { splitLink, isMapLink, resolvePlaceLink, regionFromAddress } from "@/lib/placeLink";

// 장소 입력은 장소 이름, 지도 링크, 또는 "이름 + 링크". (식당뿐 아니라 카페·보드게임카페 같은 놀거리도)
// 링크는 미리보기 정보로 정확한 이름과 지역을 알아낸다. 네이버 지도 링크는 이름이 안 읽혀서 같이 적은 이름을 쓴다.
async function placeFromInput(text, region) {
  const { name, url } = splitLink(text);
  const link = url && isMapLink(url) ? url : null;
  if (!link) return name ? { label: name, region: region || null, map_url: null } : null;
  const found = await resolvePlaceLink(link).catch(() => null);
  if (found) return { label: found.name, region: region || regionFromAddress(found.address), map_url: found.url };
  return name ? { label: name, region: region || null, map_url: link } : null;
}
const LINK_HELP = "링크 앞에 장소 이름과 지점을 같이 적어 주세요. (예: 평화김해뒷고기 경성대점 https://naver.me/…)";

// 장소가 추가되면 응답을 먼저 보내고, AI 요약은 뒤에서 만든다. (10초 넘게 걸려서)
const aiStatus = () => (aiEnabled() ? "pending" : "none");
function summarizeLater(ids) {
  if (!aiEnabled() || !ids.length) return;
  after(async () => {
    for (const id of ids) await summarizePlace(id);
  });
}

// 로그인이 없으므로, 이름을 처음 고른 기기에 그 이름을 묶는다(선착순 잠금).
// 쿠키에는 참여자 ID가 아니라 비밀 키(claim_token)를 넣어서, 다른 사람이 ID를 알아도 그 이름으로 들어올 수 없다.
const cookieName = (meetingId) => `mp_${meetingId}`;
const adminCookieName = (meetingId) => `mpa_${meetingId}`;
const COOKIE = { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 60, path: "/" };
const PIN_TRIES = 5;
const PIN_LOCK_MINUTES = 10;
const lines = (text) =>
  String(text || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
// 모임 만들기는 칸마다 같은 이름으로 보낸다. (한 칸에 여러 줄을 붙여 넣어도 나눠서 받는다)
const list = (formData, key) => formData.getAll(key).flatMap(lines);
const toInt = (v) => {
  const n = parseInt(String(v || "").replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

async function currentParticipant(meetingId) {
  const store = await cookies();
  const token = store.get(cookieName(meetingId))?.value;
  if (!token) return null;
  const { data } = await db().from("participants").select("*").eq("claim_token", token).eq("meeting_id", meetingId).maybeSingle();
  return data;
}

async function isAdmin(meetingId) {
  const store = await cookies();
  const token = store.get(adminCookieName(meetingId))?.value;
  if (!token) return false;
  const { data } = await db().from("meetings").select("id").eq("id", meetingId).eq("admin_token", token).maybeSingle();
  return Boolean(data);
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
  const names = [...new Set(list(formData, "names"))];
  const dates = [...new Set(list(formData, "dates"))];
  const places = list(formData, "places");

  if (!title) return { error: "모임 이름을 적어 주세요." };
  if (!deadlineLocal) return { error: "투표 마감 시간을 정해 주세요." };
  // 입력한 시간은 한국 시간으로 본다.
  const deadline = new Date(`${deadlineLocal}:00+09:00`);
  if (Number.isNaN(deadline.getTime()) || deadline <= new Date()) return { error: "마감 시간은 지금보다 뒤여야 해요." };
  if (names.length < 2) return { error: "참여자 이름을 두 명 이상 한 줄에 한 명씩 적어 주세요." };

  // 장소 링크는 모임을 만들기 전에 확인해서, 못 읽은 줄이 있으면 고쳐 달라고 한다.
  const placeRows = mode !== "date" ? await Promise.all(places.map((text) => placeFromInput(text))) : [];
  const badPlace = placeRows.findIndex((p) => !p);
  if (badPlace >= 0) return { error: `장소 "${places[badPlace]}"에서 이름을 읽지 못했어요. ${LINK_HELP}` };

  const { data: meeting, error } = await db()
    .from("meetings")
    .insert({ title, mode, deadline: deadline.toISOString() })
    .select("id, admin_token")
    .single();
  if (error) return { error: "모임을 만들지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  // 모임을 만든 기기는 모임장으로 기억한다. (다른 기기는 모임장 링크로)
  (await cookies()).set(adminCookieName(meeting.id), meeting.admin_token, COOKIE);

  await db().from("participants").insert(names.map((name) => ({ meeting_id: meeting.id, name })));

  const initial = [
    // 여러 줄을 한 번에 넣을 때는 모든 줄의 칸이 같아야 한다. (빠진 칸은 null로 들어가서 ai_status 제약에 걸림)
    ...(mode !== "place" ? dates.map((label) => ({ meeting_id: meeting.id, kind: "date", label, region: null, map_url: null, ai_status: "none" })) : []),
    ...placeRows.map((p) => ({ meeting_id: meeting.id, kind: "place", ...p, ai_status: aiStatus() })),
  ];
  if (initial.length) {
    const { data: inserted, error: candError } = await db().from("candidates").insert(initial).select("id, kind");
    if (candError) console.error("처음 후보 저장 실패", candError.message);
    summarizeLater((inserted || []).filter((c) => c.kind === "place").map((c) => c.id));
  }

  redirect(`/m/${meeting.id}?new=1`);
}

// 2. 명단에서 내 이름 고르기
// 아직 아무도 안 고른 이름이면 이 기기에 묶고 번호 3자리를 발급한다. 이미 누가 고른 이름이면 번호를 물어본다.
export async function chooseParticipant(meetingId, participantId) {
  const open = await openMeeting(meetingId);
  if (open.error) return { error: open.error };
  const token = randomBytes(24).toString("base64url");
  const pin = String(randomInt(0, 1000)).padStart(3, "0");
  // claim_token이 비어 있을 때만 바꿔서, 두 사람이 동시에 눌러도 한 명만 차지한다.
  const { data } = await db()
    .from("participants")
    .update({ claim_token: token, pin, pin_fails: 0, pin_locked_until: null })
    .eq("id", participantId)
    .eq("meeting_id", meetingId)
    .is("claim_token", null)
    .select("id")
    .maybeSingle();
  if (!data) return { locked: true };
  (await cookies()).set(cookieName(meetingId), token, COOKIE);
  redirect(`/m/${meetingId}?welcome=1`);
}

// 이미 고른 이름에 번호로 들어오기 (다른 폰·브라우저). 5번 틀리면 10분 동안 막는다.
export async function unlockParticipant(meetingId, participantId, prevState, formData) {
  const pin = String(formData.get("pin") || "").replace(/[^0-9]/g, "");
  const { data: p } = await db()
    .from("participants")
    .select("id, claim_token, pin, pin_fails, pin_locked_until")
    .eq("id", participantId)
    .eq("meeting_id", meetingId)
    .maybeSingle();
  if (!p) return { error: "이름을 찾을 수 없어요." };
  if (!p.claim_token) return { error: "아직 아무도 안 고른 이름이에요. 이름을 다시 눌러 주세요." };

  const now = new Date();
  if (p.pin_locked_until && new Date(p.pin_locked_until) > now) {
    const min = Math.ceil((new Date(p.pin_locked_until) - now) / 60000);
    return { error: `번호를 여러 번 틀려서 잠겼어요. ${min}분 뒤에 다시 해 주세요.` };
  }
  if (pin !== p.pin) {
    const fails = p.pin_fails + 1;
    const lock = fails >= PIN_TRIES;
    await db()
      .from("participants")
      .update({ pin_fails: lock ? 0 : fails, pin_locked_until: lock ? new Date(now.getTime() + PIN_LOCK_MINUTES * 60000).toISOString() : null })
      .eq("id", p.id);
    return { error: lock ? `${PIN_TRIES}번 틀려서 ${PIN_LOCK_MINUTES}분 동안 잠겼어요.` : `번호가 달라요. (${PIN_TRIES - fails}번 남음)` };
  }

  await db().from("participants").update({ pin_fails: 0, pin_locked_until: null }).eq("id", p.id);
  (await cookies()).set(cookieName(meetingId), p.claim_token, COOKIE);
  refresh();
  return { ok: true };
}

// 이 기기에서만 나간다. 이름은 계속 내 것으로 잠겨 있고, 번호로 다시 들어올 수 있다.
export async function forgetParticipant(meetingId) {
  const store = await cookies();
  store.delete(cookieName(meetingId));
  refresh();
}

// 모임장: 명단에 사람 추가 (나중에 합류한 친구). 새 사람은 모든 후보에 "아직 답 안 함"으로 시작한다.
export async function addParticipant(meetingId, prevState, formData) {
  if (!(await isAdmin(meetingId))) return { error: "모임장만 할 수 있어요." };
  const open = await openMeeting(meetingId);
  if (open.error) return { error: open.error };
  const name = String(formData.get("name") || "").trim().slice(0, 20);
  if (!name) return { error: "이름을 적어 주세요." };
  const { error } = await db().from("participants").insert({ meeting_id: meetingId, name });
  // unique(meeting_id, name) 제약에 걸리면 이미 있는 이름
  if (error) return { error: error.code === "23505" ? "이미 명단에 있는 이름이에요." : "추가하지 못했어요." };
  refresh();
  return { ok: true, name, at: new Date().toISOString() };
}

// 모임장: 명단에서 빼기 (스크린샷 등으로 넣었는데 모임 대상이 아닌 사람, 오타·중복).
// 남을 "불참"으로 만드는 게 아니라 명단에서 지우는 것이라, 그 사람의 투표도 함께 지워진다(응답은 cascade).
export async function removeParticipant(meetingId, participantId) {
  if (!(await isAdmin(meetingId))) return { error: "모임장만 할 수 있어요." };
  const { data: people } = await db().from("participants").select("id").eq("meeting_id", meetingId);
  if (!people?.some((p) => p.id === participantId)) return { error: "이름을 찾을 수 없어요." };
  if (people.length <= 2) return { error: "명단은 2명 이상이어야 해요." };
  await db().from("participants").delete().eq("id", participantId).eq("meeting_id", meetingId);
  refresh();
  return { ok: true };
}

// 모임장: 지금 마감하기 (다 모였으면 마감 시간을 기다리지 않고 바로 결과를 확정한다)
export async function closeNow(meetingId) {
  if (!(await isAdmin(meetingId))) return { error: "모임장만 할 수 있어요." };
  await db().from("meetings").update({ deadline: new Date().toISOString() }).eq("id", meetingId);
  refresh();
  return { ok: true };
}

// 모임장: 동점 항목으로만 재투표 열기. 같은 링크·같은 명단 그대로, 동점이었던 후보만 남기고 처음부터 다시 투표한다.
// 동점이 아니었던 쪽(예: 장소는 1위가 하나)은 그 1위만 남겨 확정된 채로 둔다. 불참한 사람은 불참 그대로.
export async function revote(meetingId, prevState, formData) {
  if (!(await isAdmin(meetingId))) return { error: "모임장만 할 수 있어요." };
  const data = await loadMeeting(meetingId);
  if (!data) return { error: "모임을 찾을 수 없어요." };
  const { meeting, participants, candidates, responses } = data;
  if (new Date(meeting.deadline) > new Date()) return { error: "마감된 뒤에 재투표를 열 수 있어요." };

  const deadline = new Date(`${String(formData.get("deadline") || "")}:00+09:00`);
  if (Number.isNaN(deadline.getTime()) || deadline <= new Date()) return { error: "새 마감 시간은 지금보다 뒤여야 해요." };

  // 모임장이 이미 하나를 골랐더라도 재투표는 원래 동점 기준으로 연다.
  const results = [
    decide(rankDates(candidates, participants, responses), dateKey, null),
    decide(rankPlaces(candidates, participants, responses), placeKey, null),
  ];
  if (!results.some((r) => !r.winner && r.tied.length > 1)) return { error: "동점인 항목이 없어요." };
  const keep = new Set(results.flatMap((r) => (r.winner ? [r.winner] : r.tied)).map((r) => r.candidate.id));
  const drop = candidates.filter((c) => !keep.has(c.id)).map((c) => c.id);

  if (drop.length) await db().from("candidates").update({ dropped: true }).in("id", drop);
  await db().from("responses").delete().in("candidate_id", [...keep]);
  await db().from("participants").update({ voted_at: null }).eq("meeting_id", meetingId);
  await db()
    .from("meetings")
    .update({ deadline: deadline.toISOString(), round: (meeting.round || 1) + 1, final_date_id: null, final_place_id: null })
    .eq("id", meetingId);
  refresh();
  return { ok: true };
}

// 모임장: 마감 후 1위가 동점일 때 하나를 골라 확정한다.
export async function pickFinal(meetingId, candidateId) {
  if (!(await isAdmin(meetingId))) return { error: "모임장만 할 수 있어요." };
  const { data: m } = await db().from("meetings").select("deadline").eq("id", meetingId).maybeSingle();
  if (!m || new Date(m.deadline) > new Date()) return { error: "마감된 뒤에 고를 수 있어요." };
  const { data: c } = await db().from("candidates").select("id, kind").eq("id", candidateId).eq("meeting_id", meetingId).maybeSingle();
  if (!c) return { error: "후보를 찾을 수 없어요." };
  await db()
    .from("meetings")
    .update(c.kind === "date" ? { final_date_id: c.id } : { final_place_id: c.id })
    .eq("id", meetingId);
  refresh();
  return { ok: true };
}

// 모임장: 이름 잠금 풀기 (번호를 잊었거나, 남이 먼저 내 이름을 골랐을 때). 그 이름의 응답도 지운다.
export async function resetParticipant(meetingId, participantId) {
  if (!(await isAdmin(meetingId))) return { error: "모임장만 할 수 있어요." };
  const { data: p } = await db().from("participants").select("id").eq("id", participantId).eq("meeting_id", meetingId).maybeSingle();
  if (!p) return { error: "이름을 찾을 수 없어요." };
  await db().from("responses").delete().eq("participant_id", p.id);
  await db()
    .from("participants")
    .update({ claim_token: null, pin: null, pin_fails: 0, pin_locked_until: null, voted_at: null, budget: null, absent: false })
    .eq("id", participantId)
    .eq("meeting_id", meetingId);
  refresh();
  return { ok: true };
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
    .update({ budget: toInt(formData.get("budget")), voted_at: me.voted_at || now, absent: false })
    .eq("id", me.id);

  refresh();
  return { ok: true, at: now };
}

// 3-1. 이번엔 불참 (본인만). 날짜·장소 답은 지우지 않아서, 다시 참석으로 저장하면 그대로 살아난다.
export async function setAbsent(meetingId) {
  const open = await openMeeting(meetingId);
  if (open.error) return { error: open.error };
  const me = await currentParticipant(meetingId);
  if (!me) return { error: "명단에서 이름을 먼저 골라 주세요." };
  await db()
    .from("participants")
    .update({ absent: true, voted_at: me.voted_at || new Date().toISOString() })
    .eq("id", me.id);
  refresh();
  return { ok: true };
}

// 4. 후보 추가 (누구나)
export async function addCandidate(meetingId, prevState, formData) {
  const open = await openMeeting(meetingId);
  if (open.error) return { error: open.error };
  const me = await currentParticipant(meetingId);
  if (!me) return { error: "명단에서 이름을 먼저 골라 주세요." };

  if (open.meeting.round > 1) return { error: "재투표 중에는 후보를 추가할 수 없어요." };

  const kind = formData.get("kind") === "place" ? "place" : "date";
  const input = String(formData.get("label") || "").trim();
  if (!input) return { error: kind === "date" ? "날짜를 골라 주세요." : "장소 이름이나 지도 링크를 적어 주세요." };

  const row = { meeting_id: meetingId, kind, label: input, added_by: me.id };
  if (kind === "date") {
    const { data: same } = await db().from("candidates").select("id").eq("meeting_id", meetingId).eq("kind", "date").eq("label", input).limit(1);
    if (same?.length) return { error: "이미 있는 날짜 후보예요." };
  }
  if (kind === "place") {
    const place = await placeFromInput(input, String(formData.get("region") || "").trim());
    if (!place) return { error: `링크에서 장소 이름을 읽지 못했어요. ${LINK_HELP}` };
    const price = toInt(formData.get("price"));
    Object.assign(row, {
      ...place,
      description: String(formData.get("description") || "").trim() || null,
      price_min: price,
      price_max: price,
      ai_status: aiStatus(),
    });
  }

  const { data: inserted, error } = await db().from("candidates").insert(row).select("id").single();
  if (error) return { error: "후보를 추가하지 못했어요." };
  if (kind === "place") summarizeLater([inserted.id]);

  refresh();
  return { ok: true, label: row.label, kind, at: new Date().toISOString() };
}
