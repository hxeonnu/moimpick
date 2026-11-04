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
  console.log(table.padEnd(13), error ? `오류: ${error.message}` : `연결됨 (${count}행)`);
}
