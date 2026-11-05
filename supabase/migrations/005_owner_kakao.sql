-- 카카오로 내 모임 연결 (11/5)
-- 모임장이 원하면 카카오 로그인으로 모임을 자기 카카오 계정에 묶는다. 쿠키가 지워지거나 다른 폰이어도 내 모임을 찾을 수 있게.
-- 카카오 회원번호만 저장한다 (이름·이메일·프로필은 받지 않음).
-- Supabase 대시보드 > SQL Editor에 붙여 넣고 Run.
alter table meetings
  add column if not exists owner_kakao_id text;  -- 이 모임을 연결한 모임장의 카카오 회원번호 (연결 안 했으면 null)

create index if not exists meetings_owner_kakao_id_idx on meetings (owner_kakao_id);
