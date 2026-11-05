-- 개인 불참 (11/5)
-- 사람이 많은 모임에서 못 가는 사람이 직접 "이번엔 불참"을 누르면 순위 계산에서 빠진다.
-- 상태: 불참 = absent / 참석 = 투표함(voted_at 있음) / 무응답 = 둘 다 아님
-- Supabase 대시보드 > SQL Editor에 붙여 넣고 Run.
alter table participants
  add column absent boolean not null default false;   -- 본인이 이번 모임 불참을 눌렀는지
