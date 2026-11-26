create table if not exists public.serve_student_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  church text not null default '',
  motivation text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_serve_student_applications_created
  on public.serve_student_applications(created_at desc);
create index if not exists idx_serve_student_applications_status
  on public.serve_student_applications(status, created_at desc);

drop trigger if exists trg_serve_student_applications_updated
  on public.serve_student_applications;
create trigger trg_serve_student_applications_updated
  before update on public.serve_student_applications
  for each row execute function set_updated_at();

alter table public.serve_student_applications enable row level security;
grant all on public.serve_student_applications to service_role;

create table if not exists public.serve_timetable (
  id uuid primary key default gen_random_uuid(),
  study_number integer not null unique check (study_number > 0),
  title text not null,
  description text not null default '',
  session_date date,
  start_time time,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_serve_timetable_published_order
  on public.serve_timetable(published, study_number);

drop trigger if exists trg_serve_timetable_updated on public.serve_timetable;
create trigger trg_serve_timetable_updated
  before update on public.serve_timetable
  for each row execute function set_updated_at();

alter table public.serve_timetable enable row level security;
grant select on public.serve_timetable to anon, authenticated;
grant all on public.serve_timetable to service_role;

drop policy if exists "Public can read published SERVE timetable"
  on public.serve_timetable;
create policy "Public can read published SERVE timetable"
  on public.serve_timetable for select to anon, authenticated
  using (published or is_admin());

create table if not exists public.serve_timetable_revisions (
  id boolean primary key default true check (id),
  updated_at timestamptz not null default now()
);

insert into public.serve_timetable_revisions (id) values (true)
on conflict (id) do nothing;

alter table public.serve_timetable_revisions enable row level security;
grant select on public.serve_timetable_revisions to anon, authenticated;
grant all on public.serve_timetable_revisions to service_role;

drop policy if exists "Public can read SERVE timetable revision"
  on public.serve_timetable_revisions;
create policy "Public can read SERVE timetable revision"
  on public.serve_timetable_revisions for select to anon, authenticated
  using (true);

create or replace function public.bump_serve_timetable_revision()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.serve_timetable_revisions (id, updated_at)
  values (true, now())
  on conflict (id) do update set updated_at = excluded.updated_at;
  return null;
end; $$;

drop trigger if exists trg_serve_timetable_revision on public.serve_timetable;
create trigger trg_serve_timetable_revision
  after insert or update or delete on public.serve_timetable
  for each statement execute function public.bump_serve_timetable_revision();

insert into public.serve_timetable (study_number, title) values
  (1, 'The Bible — God''s Inspired Word'),
  (2, 'How to Study the Bible'),
  (3, 'God — Who Is He?'),
  (4, 'Jesus Christ — Our Saviour'),
  (5, 'The Holy Spirit'),
  (6, 'Creation and the Origin of Life'),
  (7, 'The Origin of Sin and the Great Controversy'),
  (8, 'The Fall of Man and the Consequences of Sin'),
  (9, 'God''s Plan of Salvation'),
  (10, 'Faith, Repentance and Conversion'),
  (11, 'Baptism and the New Birth'),
  (12, 'The Ten Commandments — God''s Law'),
  (13, 'The Sabbath — God''s Holy Day'),
  (14, 'The True Church of God'),
  (15, 'The Remnant Church and Its Mission'),
  (16, 'The Spirit of Prophecy'),
  (17, 'Death — What Happens When We Die?'),
  (18, 'The Resurrection'),
  (19, 'Hell and the Final Destruction of Sin'),
  (20, 'The Second Coming of Jesus'),
  (21, 'Signs of Christ''s Second Coming'),
  (22, 'The Millennium'),
  (23, 'The New Earth'),
  (24, 'The Sanctuary — God''s Plan of Redemption'),
  (25, 'The Earthly Sanctuary and Its Services'),
  (26, 'The Heavenly Sanctuary'),
  (27, 'The Day of Atonement'),
  (28, 'The Investigative Judgment'),
  (29, 'The 2300 Days and 1844'),
  (30, 'The Three Angels'' Messages'),
  (31, 'The Mark of the Beast'),
  (32, 'The Seal of God'),
  (33, 'Babylon and the Fall of Babylon'),
  (34, 'Sunday Worship and the Sabbath Controversy'),
  (35, 'The Final Crisis'),
  (36, 'Christian Stewardship'),
  (37, 'Prayer and the Christian Life'),
  (38, 'Christian Health and Temperance'),
  (39, 'The Gift of Evangelism and Christian Service'),
  (40, 'Preparing to Meet Jesus')
on conflict (study_number) do nothing;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'serve_timetable_revisions'
    ) then
      alter publication supabase_realtime add table public.serve_timetable_revisions;
    end if;
  end if;
end $$;
