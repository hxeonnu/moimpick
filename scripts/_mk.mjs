import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
for (const l of fs.readFileSync(".env.local", "utf8").split("\n")) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim(); }
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: m } = await db.from("meetings").insert({ title: "[시험] 초기화", mode: "both", deadline: "2026-11-06T11:00:00Z" }).select("id").single();
await db.from("participants").insert([{ meeting_id: m.id, name: "시험1" }, { meeting_id: m.id, name: "시험2" }]);
await db.from("candidates").insert([
  { meeting_id: m.id, kind: "date", label: "11/8 (토) 저녁", region: null, map_url: null, ai_status: "none" },
  { meeting_id: m.id, kind: "date", label: "11/9 (일) 점심", region: null, map_url: null, ai_status: "none" },
  { meeting_id: m.id, kind: "place", label: "레드버튼 경성대점", region: null, map_url: null, ai_status: "none" },
]);
console.log(m.id);
