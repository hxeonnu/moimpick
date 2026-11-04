-- 이름 선착순 잠금 (11/4)
-- 링크 하나로 들어와도 다른 사람 이름으로 투표하지 못하게, 이름을 처음 고른 기기에 묶는다.
-- Supabase 대시보드 > SQL Editor에 붙여 넣고 Run.
alter table participants
  add column claim_token      text unique,                 -- 이름을 고른 기기의 쿠키에 넣는 비밀 키 (null이면 아직 아무도 안 고름)
  add column pin              text,                        -- 다른 기기에서 들어올 때 쓰는 번호 3자리
  add column pin_fails        integer not null default 0,  -- 번호를 연속으로 틀린 횟수
  add column pin_locked_until timestamptz;                 -- 5번 틀리면 이 시각까지 번호 입력 막음
