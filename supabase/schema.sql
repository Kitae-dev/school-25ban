-- =============================================
-- 숙명여중 2-5반 학부모 공지 앱 DB 스키마
-- Supabase SQL Editor에 전체 붙여넣기 후 실행
-- =============================================

-- 1. 공지사항
create table if not exists notices (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  body         text not null,
  category     text not null default 'general',
  -- category: 'general' | 'attendance' | 'exam' | 'event' | 'urgent'
  is_pinned    boolean default false,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- 2. 학사일정
create table if not exists schedules (
  id           uuid primary key default gen_random_uuid(),
  month        text not null,        -- '3월', '4월' ...
  date_str     text not null,        -- '3일', '29~30일' ...
  title        text not null,
  sub_title    text,
  type         text not null default 'event',
  -- type: 'exam' | 'holiday' | 'event' | 'break'
  sort_order   int default 0,
  created_at   timestamptz default now()
);

-- 3. 자원봉사 / 시험감독
create table if not exists volunteers (
  id           uuid primary key default gen_random_uuid(),
  category     text not null,
  -- category: 'lunch' | 'exam_supervisor' | 'delegate'
  time_slot    text,
  student_name text not null,
  parent_name  text not null,
  semester     text,                 -- '1학기' | '2학기'
  exam_type    text,                 -- '중간' | '기말'
  exam_date    text,
  created_at   timestamptz default now()
);

-- 4. 연락처
create table if not exists contacts (
  id           uuid primary key default gen_random_uuid(),
  category     text not null,
  -- category: 'teacher' | 'uniform' | 'sports' | 'parent_rep'
  name         text not null,
  phone        text,
  phone2       text,
  address      text,
  website      text,
  note         text,
  sort_order   int default 0,
  created_at   timestamptz default now()
);

-- 5. 댓글 / 반응
create table if not exists comments (
  id           uuid primary key default gen_random_uuid(),
  notice_id    uuid references notices(id) on delete cascade,
  author_name  text not null,        -- 익명 닉네임 (예: "학부모3")
  body         text not null,
  created_at   timestamptz default now()
);

create table if not exists reactions (
  id           uuid primary key default gen_random_uuid(),
  notice_id    uuid references notices(id) on delete cascade,
  emoji        text not null,        -- '👍' | '❤️' | '😮' | '🙏'
  session_id   text not null,        -- 브라우저 fingerprint (중복방지)
  created_at   timestamptz default now(),
  unique(notice_id, emoji, session_id)
);

-- 6. 푸시 구독 정보
create table if not exists push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  created_at   timestamptz default now()
);

-- =============================================
-- RLS (Row Level Security) 설정
-- =============================================

alter table notices          enable row level security;
alter table schedules        enable row level security;
alter table volunteers       enable row level security;
alter table contacts         enable row level security;
alter table comments         enable row level security;
alter table reactions        enable row level security;
alter table push_subscriptions enable row level security;

-- 공지/일정/자원봉사/연락처: 누구나 읽기 가능
create policy "public read notices"      on notices          for select using (true);
create policy "public read schedules"    on schedules        for select using (true);
create policy "public read volunteers"   on volunteers       for select using (true);
create policy "public read contacts"     on contacts         for select using (true);
create policy "public read comments"     on comments         for select using (true);
create policy "public read reactions"    on reactions        for select using (true);

-- 쓰기는 service_role(관리자) 또는 anon 허용 범위 지정
create policy "anon insert comments"     on comments         for insert with check (true);
create policy "anon insert reactions"    on reactions        for insert with check (true);
create policy "anon delete reactions"    on reactions        for delete using (true);
create policy "anon insert push_sub"     on push_subscriptions for insert with check (true);

-- notices/schedules/volunteers/contacts 쓰기는 service_role만 (관리자 API)
create policy "service write notices"    on notices          for all using (auth.role() = 'service_role');
create policy "service write schedules"  on schedules        for all using (auth.role() = 'service_role');
create policy "service write volunteers" on volunteers       for all using (auth.role() = 'service_role');
create policy "service write contacts"   on contacts         for all using (auth.role() = 'service_role');

-- =============================================
-- 초기 데이터 입력
-- =============================================

-- 공지사항
insert into notices (title, body, category, is_pinned) values
('학부모 상담 신청 안내', '학부모 상담은 가급적 2학기부터 신청해 주세요. 1학기 동안 선생님께서 학생을 충분히 파악하신 후 진행합니다.', 'general', false),
('등교 시간 및 출결 연락 방법', E'• 2-5반 등교시간: 오전 8시 25분\n• 지각·결석 등 모든 출결 연락은 오전 8시 20분 이전에 전화 필수\n• 담임선생님 직통: 02-6480-5344', 'attendance', true),
('NEIS 지각 처리 기준 시간', '나이스(NEIS) 기준 지각 처리 시간은 오전 8시 30분입니다.', 'attendance', false),
('시험 범위 고지 일정', '각 정기고사 시험 범위는 시험 3주 전에 확정 고지됩니다.', 'exam', false),
('출결 신고서 양식 변경 안내', E'출결 신고서 양식이 변경되었습니다. 반드시 새 양식을 사용해 주세요.\n\n다운로드: 학교 홈페이지 → 게시판 → 제출양식 → "2026출결신고서" 다운로드', 'attendance', true);

-- 학사일정
insert into schedules (month, date_str, title, sub_title, type, sort_order) values
('3월','3일','개학식',null,'event',1),
('3월','17일','학부모 총회',null,'event',2),
('4월','29~30일','1학기 중간고사','국어, 수학, 과학, 영어','exam',3),
('5월','1일~5일','재량휴업일','노동절, 어린이날','holiday',4),
('5월','15일','체육대회',null,'event',5),
('5월','19일','공개수업일',null,'event',6),
('5월','25~27일','대체공휴일+재량휴업',null,'holiday',7),
('6월','3일','휴일 - 전국 지방 선거',null,'holiday',8),
('7월','1~3일','1학기 기말고사','국어, 역사, 수학, 과학, 영어, 중국어','exam',9),
('7월','17일','공휴일 - 제헌절',null,'holiday',10),
('7월','22일','방학식',null,'event',11),
('7월','23일~8월13일','여름방학',null,'break',12),
('8월','14일','개학식',null,'event',13),
('8월','17일','대체공휴일',null,'holiday',14),
('9월','24~25일','추석 연휴',null,'holiday',15),
('10월','1~2일','2학기 중간고사','국어, 수학, 과학, 영어','exam',16),
('10월','5일','대체공휴일 - 개천절',null,'holiday',17),
('10월','9일','공휴일 - 한글날',null,'holiday',18),
('10월','14~16일','수련회 (미정)','학부모 동의 70% 이상 시 진행 · 경비 약 35만원','event',19),
('11월','13일','영란제 리허설 (전일제)',null,'event',20),
('11월','16일','영란제',null,'event',21),
('11월','18일','4교시 단축수업',null,'event',22),
('11월','19~20일','재량휴업일 (수능)',null,'holiday',23),
('12월','7~9일','2학기 기말고사','국어, 도덕, 역사, 수학, 과학, 영어, 중국어','exam',24),
('12월','25일','공휴일 - 성탄절',null,'holiday',25),
('12월','31일','방학식',null,'event',26),
('1월','1일~31일','겨울방학',null,'break',27),
('2월','1일','개학식',null,'event',28),
('2월','4일','졸업식, 종업식',null,'event',29),
('2월','5일~3월1일','봄방학',null,'break',30);

-- 자원봉사
insert into volunteers (category, time_slot, student_name, parent_name) values
('lunch','오전 6:30~7:00','김서희','송보연'),
('lunch','오후 12:30~13:30','박가온','권희지');

insert into volunteers (category, student_name, parent_name, semester, exam_type, exam_date) values
('exam_supervisor','정은송','원송주','1학기','중간','4월 29일'),
('exam_supervisor','이다연','이태림','1학기','중간','4월 30일'),
('exam_supervisor','최지유','윤세진','1학기','기말','7월 1일'),
('exam_supervisor','이서은','백승진','1학기','기말','7월 2일'),
('exam_supervisor','서루하','홍윤희','1학기','기말','7월 3일'),
('exam_supervisor','배정은','김혜영','2학기','중간','10월 1일'),
('exam_supervisor','최영은','하유진','2학기','중간','10월 2일'),
('exam_supervisor','전하율','소현숙','2학기','기말','12월 7일'),
('exam_supervisor','이다연','이태림','2학기','기말','12월 8일'),
('exam_supervisor','김연수','정희원','2학기','기말','12월 9일');

insert into volunteers (category, student_name, parent_name) values
('delegate','이다연','이태림'),
('delegate','김연수','정희원');

-- 연락처
insert into contacts (category, name, phone, note, sort_order) values
('teacher','이학선 담임선생님','02-6480-5344','3층 생활안전부 · 중국어 담당',1);

insert into contacts (category, name, phone, phone2, address, website, sort_order) values
('sports','서울패션 (체육복)','02-3432-0396','02-414-2482 / 02-425-1254','경기도 하남시 감일동 385-2, 3층','www.wlschool.co.kr',2),
('uniform','아이비클럽 (교복)','02-561-6695','010-5594-7411','서울시 강남구 삼성로 212-2 은마상가 A-232',null,3);

insert into contacts (category, name, phone, note, sort_order) values
('parent_rep','김연수 어머님 (1학기 반장)','010-8579-8078','정희원 학부모',4);
