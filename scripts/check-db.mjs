// DB 연결 확인: node --env-file=.env.local scripts/check-db.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log("SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 .env.local에 비어 있음");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
for (const table of ["meetings", "participants", "candidates", "responses"]) {
  const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
  if (error) console.log(table.padEnd(13), `오류: ${error.message}`);
  else if (count === null) console.log(table.padEnd(13), "응답이 이상함: SUPABASE_URL 끝에 /rest/v1 같은 경로가 붙어 있지 않은지 확인");
  else console.log(table.padEnd(13), `연결됨 (${count}행)`);
}
