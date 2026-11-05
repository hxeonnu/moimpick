-- 확정 결과와 동점 재투표 (11/5)
-- 마감 후 1위가 동점이면 모임장이 ① 하나를 골라 확정하거나 ② 동점 그대로 공지하거나 ③ 동점 항목으로만 재투표를 연다.
-- Supabase 대시보드 > SQL Editor에 붙여 넣고 Run. (여러 번 실행해도 괜찮게 if not exists)
alter table meetings
  add column if not exists final_date_id  uuid references candidates (id) on delete set null, -- 동점 중 모임장이 고른 날짜
  add column if not exists final_place_id uuid references candidates (id) on delete set null, -- 동점 중 모임장이 고른 장소
  add column if not exists round          integer not null default 1;                         -- 몇 번째 투표인지 (재투표하면 2, 3…)

alter table candidates
  add column if not exists dropped boolean not null default false; -- 재투표에서 빠진 후보 (동점이 아니었던 후보)
