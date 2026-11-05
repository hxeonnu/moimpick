import { loadMeeting } from "@/lib/db";
import { rankDates, rankPlaces, decide, dateKey, placeKey } from "@/lib/ranking";
import { parseDateLabel } from "@/lib/format";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 캘린더 글자 규칙: 쉼표·세미콜론·줄바꿈은 \로 막는다.
const esc = (s) =>
  String(s || "")
    .replace(/\\/g, "\\\\")
    .replace(/[,;]/g, (c) => "\\" + c)
    .replace(/\n/g, "\\n");
const pad = (n) => String(n).padStart(2, "0");
const utc = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

// 확정된 약속을 휴대폰 캘린더에 넣는 .ics 파일. 시간이 있으면 2시간 일정, 없으면 하루 종일 일정.
export async function GET(request, { params }) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response("not found", { status: 404 });
  const data = await loadMeeting(id);
  if (!data || new Date(data.meeting.deadline) > new Date()) return new Response("not found", { status: 404 });
  const { meeting, participants, candidates, responses } = data;

  const date = decide(rankDates(candidates, participants, responses), dateKey, meeting.final_date_id).winner;
  const place = decide(rankPlaces(candidates, participants, responses), placeKey, meeting.final_place_id).winner;
  const when = date && parseDateLabel(date.candidate.label, meeting.created_at);
  if (!when) return new Response("not found", { status: 404 });

  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//moimpick//KO", "CALSCALE:GREGORIAN", "BEGIN:VEVENT"];
  lines.push(`UID:${id}@moimpick`, `DTSTAMP:${utc(new Date())}`);
  if (when.hour != null) {
    // 한국 시간 → UTC (9시간 빼기)
    const start = new Date(Date.UTC(when.year, when.month - 1, when.day, when.hour - 9, when.minute));
    lines.push(`DTSTART:${utc(start)}`, `DTEND:${utc(new Date(start.getTime() + 2 * 3600000))}`);
  } else {
    const next = new Date(Date.UTC(when.year, when.month - 1, when.day + 1));
    lines.push(
      `DTSTART;VALUE=DATE:${when.year}${pad(when.month)}${pad(when.day)}`,
      `DTEND;VALUE=DATE:${next.getUTCFullYear()}${pad(next.getUTCMonth() + 1)}${pad(next.getUTCDate())}`,
    );
  }
  lines.push(`SUMMARY:${esc(meeting.title)}`);
  if (place) {
    const c = place.candidate;
    lines.push(`LOCATION:${esc([c.label, c.ai_summary?.address || c.region].filter(Boolean).join(" "))}`);
  }
  lines.push(`DESCRIPTION:${esc(`모임픽에서 정한 약속 ${new URL(`/m/${id}`, request.url)}`)}`, "END:VEVENT", "END:VCALENDAR");

  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="moimpick.ics"`,
    },
  });
}
