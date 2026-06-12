-- ============================================================================
-- Advent Skool — initial schema (Supabase / Postgres)
-- Auth: Supabase Auth. Data: tables below with Row Level Security.
-- Payment fulfillment writes are performed by the service role (bypasses RLS).
-- ============================================================================

-- Extensions ----------------------------------------------------------------
create extension if not exists pgcrypto;

-- Enums ---------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('student', 'teacher', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type plan_type as enum ('full', 'per_lesson', 'installment', 'bundle');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending', 'success', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type enrollment_status as enum ('in_progress', 'completed');
exception when duplicate_object then null; end $$;

-- Shared trigger: maintain updated_at --------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- ============================================================================
-- profiles (mirror of auth.users)
-- ============================================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text not null default '',
  role user_role not null default 'student',
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- New auth users get a profile row from signup metadata.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student')
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Helper: is the current user an admin? (security definer avoids RLS recursion)
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ============================================================================
-- courses
-- ============================================================================
create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'General',
  original_price numeric not null default 0,
  discounted_price numeric not null default 0,
  final_price numeric not null default 0,
  thumbnail_url text not null default '',
  outline text not null default '',
  instructor_id uuid references profiles(id) on delete set null,
  published boolean not null default false,
  lessons_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_courses_instructor on courses(instructor_id);
create index if not exists idx_courses_published on courses(published);

create trigger trg_courses_updated before update on courses
  for each row execute function set_updated_at();

-- ============================================================================
-- lessons
-- ============================================================================
create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  content_html text not null default '',
  image_url text,
  video_url text,
  video_id text,
  order_index integer not null default 1,
  quiz jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_lessons_course on lessons(course_id);
create index if not exists idx_lessons_order on lessons(course_id, order_index);

create trigger trg_lessons_updated before update on lessons
  for each row execute function set_updated_at();

-- Keep courses.lessons_count in sync.
create or replace function sync_lessons_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  cid := coalesce(new.course_id, old.course_id);
  update public.courses set lessons_count = (
    select count(*) from public.lessons where course_id = cid
  ) where id = cid;
  return null;
end; $$;

drop trigger if exists trg_lessons_count on lessons;
create trigger trg_lessons_count after insert or delete on lessons
  for each row execute function sync_lessons_count();

-- Public, content-free preview of lessons (titles/order only).
create or replace view lesson_previews
with (security_invoker = off) as
  select id, course_id, title, order_index from lessons;

-- ============================================================================
-- enrollments
-- ============================================================================
create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  completed_lessons uuid[] not null default '{}',
  unlocked_lessons uuid[] not null default '{}',
  progress integer not null default 0,
  status enrollment_status not null default 'in_progress',
  last_opened_lesson_id uuid,
  total_study_minutes integer not null default 0,
  enrolled_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);
create index if not exists idx_enrollments_user on enrollments(user_id);
create index if not exists idx_enrollments_course on enrollments(course_id);

create trigger trg_enrollments_updated before update on enrollments
  for each row execute function set_updated_at();

-- ============================================================================
-- payments (writes: service role only)
-- ============================================================================
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  plan_type plan_type not null,
  lesson_ids uuid[] not null default '{}',
  amount numeric not null,
  currency text not null default 'KES',
  paystack_reference text not null unique,
  paystack_access_code text,
  status payment_status not null default 'pending',
  email text not null default '',
  phone text not null default '',
  full_name text not null default '',
  course_title text,
  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_payments_user on payments(user_id);
create index if not exists idx_payments_course on payments(course_id);
create index if not exists idx_payments_reference on payments(paystack_reference);
create index if not exists idx_payments_status on payments(status);

create trigger trg_payments_updated before update on payments
  for each row execute function set_updated_at();

-- ============================================================================
-- payment_plans (per-course plan configuration / overrides)
-- ============================================================================
create table if not exists payment_plans (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  plan_type plan_type not null,
  label text not null default '',
  enabled boolean not null default true,
  installment_count integer,
  created_at timestamptz not null default now(),
  unique (course_id, plan_type)
);
create index if not exists idx_payment_plans_course on payment_plans(course_id);

-- ============================================================================
-- lesson_unlocks (authoritative per-lesson access; writes: service role only)
-- ============================================================================
create table if not exists lesson_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  payment_id uuid references payments(id) on delete set null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);
create index if not exists idx_lesson_unlocks_user on lesson_unlocks(user_id);
create index if not exists idx_lesson_unlocks_lesson on lesson_unlocks(lesson_id);

-- ============================================================================
-- notifications
-- ============================================================================
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null default 'Notice',
  message text not null default '',
  read boolean not null default false,
  link text,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on notifications(user_id, created_at desc);

-- ============================================================================
-- teacher_invites
-- ============================================================================
create table if not exists teacher_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token text not null unique,
  status text not null default 'pending',
  invited_by uuid references profiles(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_teacher_invites_email on teacher_invites(email);

-- ============================================================================
-- quiz_attempts
-- ============================================================================
create table if not exists quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  score integer not null default 0,
  total integer not null default 0,
  passed boolean not null default false,
  answers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);
create index if not exists idx_quiz_attempts_user on quiz_attempts(user_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table profiles enable row level security;
alter table courses enable row level security;
alter table lessons enable row level security;
alter table enrollments enable row level security;
alter table payments enable row level security;
alter table payment_plans enable row level security;
alter table lesson_unlocks enable row level security;
alter table notifications enable row level security;
alter table teacher_invites enable row level security;
alter table quiz_attempts enable row level security;

-- profiles
create policy "profiles readable by authenticated"
  on profiles for select to authenticated using (true);
create policy "profiles update own"
  on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles admin all"
  on profiles for all to authenticated using (is_admin()) with check (is_admin());

-- courses
create policy "courses public read published"
  on courses for select using (published or instructor_id = auth.uid() or is_admin());
create policy "courses owner insert"
  on courses for insert to authenticated with check (instructor_id = auth.uid() or is_admin());
create policy "courses owner update"
  on courses for update to authenticated using (instructor_id = auth.uid() or is_admin()) with check (instructor_id = auth.uid() or is_admin());
create policy "courses owner delete"
  on courses for delete to authenticated using (instructor_id = auth.uid() or is_admin());

-- lessons: content readable only by owner/admin or users who unlocked it.
create policy "lessons read if unlocked or owner"
  on lessons for select using (
    is_admin()
    or exists (select 1 from courses c where c.id = lessons.course_id and c.instructor_id = auth.uid())
    or exists (select 1 from lesson_unlocks lu where lu.lesson_id = lessons.id and lu.user_id = auth.uid())
  );
create policy "lessons owner write"
  on lessons for all to authenticated using (
    is_admin() or exists (select 1 from courses c where c.id = lessons.course_id and c.instructor_id = auth.uid())
  ) with check (
    is_admin() or exists (select 1 from courses c where c.id = lessons.course_id and c.instructor_id = auth.uid())
  );

-- enrollments
create policy "enrollments own read"
  on enrollments for select to authenticated using (user_id = auth.uid() or is_admin());
create policy "enrollments own write"
  on enrollments for all to authenticated using (user_id = auth.uid() or is_admin()) with check (user_id = auth.uid() or is_admin());

-- payments: owner may read; no client writes (service role bypasses RLS).
create policy "payments own read"
  on payments for select to authenticated using (user_id = auth.uid() or is_admin());

-- payment_plans: readable by all; managed by course owner/admin.
create policy "payment_plans read"
  on payment_plans for select using (true);
create policy "payment_plans owner write"
  on payment_plans for all to authenticated using (
    is_admin() or exists (select 1 from courses c where c.id = payment_plans.course_id and c.instructor_id = auth.uid())
  ) with check (
    is_admin() or exists (select 1 from courses c where c.id = payment_plans.course_id and c.instructor_id = auth.uid())
  );

-- lesson_unlocks: owner read; no client writes.
create policy "lesson_unlocks own read"
  on lesson_unlocks for select to authenticated using (user_id = auth.uid() or is_admin());

-- notifications
create policy "notifications own read"
  on notifications for select to authenticated using (user_id = auth.uid() or is_admin());
create policy "notifications own update"
  on notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- teacher_invites: admin only.
create policy "teacher_invites admin"
  on teacher_invites for all to authenticated using (is_admin()) with check (is_admin());

-- quiz_attempts
create policy "quiz_attempts own read"
  on quiz_attempts for select to authenticated using (user_id = auth.uid() or is_admin());
create policy "quiz_attempts own write"
  on quiz_attempts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Allow anon/auth to read the content-free preview view.
grant select on lesson_previews to anon, authenticated;
