-- ============================================================================
-- 0005 — Live Classes (Google Calendar + Google Meet integration)
-- Adds: google_accounts (server-only OAuth token vault), meetings (live
-- classes, admin meetings, custom-invitee meetings, student reminders),
-- meeting_invitees, meeting_attendance. All meeting WRITES happen through
-- API routes using the service role (Google Calendar must stay in sync);
-- clients only READ through RLS.
-- ============================================================================

-- Enums ---------------------------------------------------------------------
do $$ begin
  create type meeting_type as enum ('live_class', 'general', 'custom', 'reminder');
exception when duplicate_object then null; end $$;

do $$ begin
  create type meeting_audience as enum ('course', 'all', 'teachers', 'students', 'custom', 'personal');
exception when duplicate_object then null; end $$;

do $$ begin
  create type meeting_status as enum ('scheduled', 'cancelled', 'completed');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- google_accounts — OAuth refresh/access tokens. SERVER ONLY (service role).
-- Clients never read tokens; connection status is exposed via the view below.
-- ============================================================================
create table if not exists google_accounts (
  user_id uuid primary key references profiles(id) on delete cascade,
  google_email text not null default '',
  access_token text not null default '',
  refresh_token text not null default '',
  token_expires_at timestamptz,
  scopes text not null default '',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_google_accounts_updated before update on google_accounts
  for each row execute function set_updated_at();

-- Token-free connection status for the signed-in user.
create or replace view google_account_status
with (security_invoker = off) as
  select user_id, google_email, connected_at
  from google_accounts
  where user_id = auth.uid();

-- ============================================================================
-- meetings
--   live_class : tied to a course; visible to enrolled students.
--   general    : admin meeting for all / teachers / students.
--   custom     : explicit invitee list (meeting_invitees).
--   reminder   : student's personal learning reminder (no Meet link required).
-- ============================================================================
create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  meeting_type meeting_type not null default 'live_class',
  audience meeting_audience not null default 'course',
  course_id uuid references courses(id) on delete cascade,
  created_by uuid not null references profiles(id) on delete cascade,
  host_id uuid not null references profiles(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  timezone text not null default 'Africa/Nairobi',
  recurrence_rule text,                -- e.g. 'RRULE:FREQ=WEEKLY;COUNT=8'
  google_event_id text,
  google_calendar_id text not null default 'primary',
  google_meet_url text,
  status meeting_status not null default 'scheduled',
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_meetings_course on meetings(course_id, start_time);
create index if not exists idx_meetings_host on meetings(host_id, start_time);
create index if not exists idx_meetings_creator on meetings(created_by, start_time);
create index if not exists idx_meetings_start on meetings(status, start_time);

create trigger trg_meetings_updated before update on meetings
  for each row execute function set_updated_at();

-- ============================================================================
-- meeting_invitees — explicit participants (admin "custom" meetings, plus a
-- snapshot of who was invited to Google Calendar for any meeting).
-- ============================================================================
create table if not exists meeting_invitees (
  meeting_id uuid not null references meetings(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  email text not null default '',
  created_at timestamptz not null default now(),
  primary key (meeting_id, user_id)
);
create index if not exists idx_meeting_invitees_user on meeting_invitees(user_id);

-- ============================================================================
-- meeting_attendance — tracked when a participant clicks Join inside
-- AdventSkool, optionally enriched from the Google Meet REST API.
-- ============================================================================
create table if not exists meeting_attendance (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  first_joined_at timestamptz not null default now(),
  last_joined_at timestamptz not null default now(),
  join_count integer not null default 1,
  duration_minutes integer,            -- filled by Google Meet sync when available
  source text not null default 'app',  -- 'app' | 'google_meet'
  unique (meeting_id, user_id)
);
create index if not exists idx_meeting_attendance_meeting on meeting_attendance(meeting_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table google_accounts enable row level security;   -- no policies: service role only
alter table meetings enable row level security;
alter table meeting_invitees enable row level security;
alter table meeting_attendance enable row level security;

-- meetings: read-only for clients (writes go through the service role API).
-- Visible to: admins, the creator/host, enrolled students of the course
-- (live_class), the targeted role audience (general), and explicit invitees.
create policy "meetings visible to audience"
  on meetings for select to authenticated
  using (
    is_admin()
    or created_by = auth.uid()
    or host_id = auth.uid()
    or (
      meeting_type = 'live_class'
      and exists (
        select 1 from enrollments e
        where e.course_id = meetings.course_id and e.user_id = auth.uid()
      )
    )
    or (
      meeting_type = 'general'
      and (
        audience = 'all'
        or (audience = 'teachers' and current_user_role() = 'teacher')
        or (audience = 'students' and current_user_role() = 'student')
      )
    )
    or exists (
      select 1 from meeting_invitees mi
      where mi.meeting_id = meetings.id and mi.user_id = auth.uid()
    )
  );

-- meeting_invitees: participants see who is invited to meetings they can see.
create policy "meeting_invitees visible to participants"
  on meeting_invitees for select to authenticated
  using (
    user_id = auth.uid()
    or is_admin()
    or exists (
      select 1 from meetings m
      where m.id = meeting_invitees.meeting_id
        and (m.created_by = auth.uid() or m.host_id = auth.uid())
    )
  );

-- meeting_attendance: own rows; hosts/admins see everyone for their meetings.
create policy "meeting_attendance own read"
  on meeting_attendance for select to authenticated
  using (
    user_id = auth.uid()
    or is_admin()
    or exists (
      select 1 from meetings m
      where m.id = meeting_attendance.meeting_id
        and (m.created_by = auth.uid() or m.host_id = auth.uid())
    )
  );

-- ============================================================================
-- handle_new_user — extend to support Google OAuth signups (name/avatar come
-- through different metadata keys than email/password signups). Profiles stay
-- the single source of truth regardless of the auth provider.
-- ============================================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone, role, photo_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      ''
    ),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student'),
    coalesce(
      nullif(new.raw_user_meta_data->>'avatar_url', ''),
      nullif(new.raw_user_meta_data->>'picture', '')
    )
  )
  on conflict (id) do nothing;
  return new;
end; $$;

-- ============================================================================
-- Grants (SQL-created tables don't inherit dashboard auto-grants — see 0002)
-- ============================================================================
grant select on meetings, meeting_invitees, meeting_attendance to authenticated;
grant select on google_account_status to authenticated;
grant all on google_accounts, meetings, meeting_invitees, meeting_attendance to service_role;
