-- 모임픽 DB 테이블
-- Supabase 대시보드 > SQL Editor에 붙여 넣고 Run을 누르면 만들어진다.
-- 모든 테이블에 RLS를 켜고 정책은 만들지 않는다.
-- → 브라우저(공개 키)로는 아무것도 못 읽고 쓰며, 우리 서버만 비밀 키로 접근한다.

-- 1. 모임: 약속 하나
create table meetings (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,                          -- 예: 종강 모임 약속 잡기
  mode        text not null default 'both'
              check (mode in ('both', 'date', 'place')), -- 무엇을 정할지
  deadline    timestamptz not null,                   -- 투표 마감 시간
  admin_token uuid not null default gen_random_uuid(), -- 모임장 전용 링크용
  created_at  timestamptz not null default now()
);

-- 2. 참여자: 모임장이 넣은 명단
create table participants (
  id         uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings (id) on delete cascade,
  name       text not null,
  budget     integer,                -- 1인 예산(원), 비우면 제한 없음
  voted_at   timestamptz,            -- 처음 투표한 시각, 안 했으면 null
  claim_token      text unique,      -- 이름을 고른 기기의 쿠키에 넣는 비밀 키 (null이면 아직 아무도 안 고름)
  pin              text,             -- 다른 기기에서 들어올 때 쓰는 번호 3자리
  pin_fails        integer not null default 0, -- 번호를 연속으로 틀린 횟수
  pin_locked_until timestamptz,      -- 5번 틀리면 이 시각까지 번호 입력 막음
  created_at timestamptz not null default now(),
  unique (meeting_id, name)
);

-- 3. 후보: 날짜 후보와 장소 후보
create table candidates (
  id          uuid primary key default gen_random_uuid(),
  meeting_id  uuid not null references meetings (id) on delete cascade,
  kind        text not null check (kind in ('date', 'place')),
  label       text not null,          -- 날짜: "11/8 (토) 저녁" / 장소: 가게 이름
  region      text,                   -- 장소 지역 (예: 경성대)
  description text,                   -- 한 줄 설명 (직접 입력)
  price_min   integer,                -- 1인 가격 범위(원)
  price_max   integer,
  map_url     text,
  added_by    uuid references participants (id) on delete set null,
  ai_summary  jsonb,                  -- AI 장소 요약 (나중에 채움)
  ai_status   text not null default 'none'
              check (ai_status in ('none', 'pending', 'done', 'failed')),
  ai_sources  jsonb,                  -- 요약 출처
  created_at  timestamptz not null default now()
);

-- 4. 응답: 누가 어느 후보에 어떻게 답했나
create table responses (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants (id) on delete cascade,
  candidate_id   uuid not null references candidates (id) on delete cascade,
  value          text not null
                 check (value in ('yes', 'no', 'good', 'neutral', 'bad')),
                 -- 날짜: yes(가능) / no(안 됨), 장소: good / neutral / bad
  updated_at     timestamptz not null default now(),
  unique (participant_id, candidate_id)
);

create index on participants (meeting_id);
create index on candidates (meeting_id);
create index on responses (candidate_id);

alter table meetings     enable row level security;
alter table participants enable row level security;
alter table candidates   enable row level security;
alter table responses    enable row level security;
