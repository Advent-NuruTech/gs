-- ============================================================================
-- 0004 — Messaging, Reports, Announcements
-- Adds: 1-to-1 student↔teacher chat (conversations + messages, realtime),
-- bug/problem reports (reports inbox for admins), and admin announcements
-- targeted at all/teachers/students with per-user read state for the bell.
-- ============================================================================

-- Enums ---------------------------------------------------------------------
do $$ begin
  create type announcement_audience as enum ('all', 'teachers', 'students');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('open', 'in_review', 'resolved');
exception when duplicate_object then null; end $$;

-- Helpers (security definer to avoid RLS recursion) --------------------------

-- Do two users share a teaching relationship? (student enrolled in teacher's course)
create or replace function in_teaching_relationship(student uuid, teacher uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from enrollments e
    join courses c on c.id = e.course_id
    where e.user_id = student and c.instructor_id = teacher
  );
$$;

-- Role of the current user.
create or replace function current_user_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ============================================================================
-- conversations — one row per (student, teacher) pair
-- ============================================================================
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  last_message text not null default '',
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, teacher_id)
);
create index if not exists idx_conversations_student on conversations(student_id, last_message_at desc);
create index if not exists idx_conversations_teacher on conversations(teacher_id, last_message_at desc);

create trigger trg_conversations_updated before update on conversations
  for each row execute function set_updated_at();

-- ============================================================================
-- messages
-- ============================================================================
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_conversation on messages(conversation_id, created_at);

-- Keep the conversation preview / ordering in sync on each new message.
create or replace function sync_conversation_last_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
    set last_message = left(new.body, 200),
        last_message_at = new.created_at,
        updated_at = now()
  where id = new.conversation_id;
  return null;
end; $$;

drop trigger if exists trg_messages_sync on messages;
create trigger trg_messages_sync after insert on messages
  for each row execute function sync_conversation_last_message();

-- ============================================================================
-- reports — bug/problem reports raised by students & teachers to admins
-- ============================================================================
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  reporter_role user_role not null default 'student',
  subject text not null default '',
  message text not null default '',
  severity text not null default 'normal',
  status report_status not null default 'open',
  admin_notes text not null default '',
  resolved_by uuid references profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_reports_status on reports(status, created_at desc);
create index if not exists idx_reports_reporter on reports(reporter_id);

create trigger trg_reports_updated before update on reports
  for each row execute function set_updated_at();

-- ============================================================================
-- announcements — admin → all / teachers / students
-- ============================================================================
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references profiles(id) on delete set null,
  title text not null default '',
  body text not null default '',
  audience announcement_audience not null default 'all',
  created_at timestamptz not null default now()
);
create index if not exists idx_announcements_created on announcements(created_at desc);

-- Per-user read state so the notification bell can show unread announcements.
create table if not exists announcement_reads (
  announcement_id uuid not null references announcements(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table conversations enable row level security;
alter table messages enable row level security;
alter table reports enable row level security;
alter table announcements enable row level security;
alter table announcement_reads enable row level security;

-- conversations: only the two participants (or admin) may read; creation is
-- limited to a valid student↔teacher teaching relationship.
create policy "conversations participant read"
  on conversations for select to authenticated
  using (student_id = auth.uid() or teacher_id = auth.uid() or is_admin());
create policy "conversations participant insert"
  on conversations for insert to authenticated
  with check (
    (student_id = auth.uid() or teacher_id = auth.uid())
    and in_teaching_relationship(student_id, teacher_id)
  );
create policy "conversations participant update"
  on conversations for update to authenticated
  using (student_id = auth.uid() or teacher_id = auth.uid())
  with check (student_id = auth.uid() or teacher_id = auth.uid());

-- messages: readable/writable by conversation participants only.
create policy "messages participant read"
  on messages for select to authenticated
  using (exists (
    select 1 from conversations c
    where c.id = messages.conversation_id
      and (c.student_id = auth.uid() or c.teacher_id = auth.uid() or is_admin())
  ));
create policy "messages participant insert"
  on messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.student_id = auth.uid() or c.teacher_id = auth.uid())
    )
  );
create policy "messages participant update"
  on messages for update to authenticated
  using (exists (
    select 1 from conversations c
    where c.id = messages.conversation_id
      and (c.student_id = auth.uid() or c.teacher_id = auth.uid())
  ));

-- reports: reporters create/read their own; admins manage all.
create policy "reports reporter insert"
  on reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "reports reporter read"
  on reports for select to authenticated using (reporter_id = auth.uid() or is_admin());
create policy "reports admin manage"
  on reports for all to authenticated using (is_admin()) with check (is_admin());

-- announcements: readable by the targeted audience; admins manage.
create policy "announcements audience read"
  on announcements for select to authenticated
  using (
    is_admin()
    or audience = 'all'
    or (audience = 'teachers' and current_user_role() = 'teacher')
    or (audience = 'students' and current_user_role() = 'student')
  );
create policy "announcements admin manage"
  on announcements for all to authenticated using (is_admin()) with check (is_admin());

-- announcement_reads: each user manages their own read markers.
create policy "announcement_reads own"
  on announcement_reads for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Allow teachers to read enrollments for courses they own (student lists/counts).
create policy "enrollments teacher read"
  on enrollments for select to authenticated
  using (exists (
    select 1 from courses c
    where c.id = enrollments.course_id and c.instructor_id = auth.uid()
  ));

-- ============================================================================
-- Grants (SQL-created tables don't inherit dashboard auto-grants — see 0002)
-- ============================================================================
grant select, insert, update, delete on
  conversations, messages, reports, announcements, announcement_reads
to authenticated;
grant all on conversations, messages, reports, announcements, announcement_reads
to service_role;

-- ============================================================================
-- Realtime — broadcast new messages & conversation updates to participants
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    execute 'alter publication supabase_realtime add table messages';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
  ) then
    execute 'alter publication supabase_realtime add table conversations';
  end if;
end $$;
