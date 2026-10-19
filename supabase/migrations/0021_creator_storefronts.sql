-- Creator storefronts and the manual custom-domain onboarding queue.
-- Public storefront URLs use https://adventskool.co.ke/@handle. Custom domain
-- routing is activated only after administrators attach/verify a hostname and
-- mark its request ready; requests are otherwise handled manually.

alter table profiles
  add column if not exists handle text,
  add column if not exists bio text not null default '',
  add column if not exists social_links jsonb not null default '{}'::jsonb;

alte  r table profiles
  drop constraint if exists profiles_handle_format_check;
alter table profiles
  drop constraint if exists profiles_creator_bio_length_check,
  drop constraint if exists profiles_social_links_object_check;
alter table profiles
  add constraint profiles_handle_format_check
  check (
    handle is null or (
      handle ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$'
      and handle not in ('admin','api','auth','checkout','cookies','courses','dashboard','designs','invite','login','privacy','register','reset-password','terms','tools','wealth')
    )
  );
alter table profiles
  add constraint profiles_creator_bio_length_check check (char_length(bio) <= 500),
  add constraint profiles_social_links_object_check check (jsonb_typeof(social_links) = 'object');

create unique index if not exists idx_profiles_handle_unique
  on profiles (lower(handle)) where handle is not null;

-- Preserve shared storefront links when a creator later changes their handle.
create table if not exists creator_handle_aliases (
  handle text primary key,
  creator_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint creator_handle_alias_format_check check (
    handle ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$'
  )
);
create index if not exists idx_creator_handle_alias_creator on creator_handle_aliases (creator_id);
alter table creator_handle_aliases enable row level security;
revoke all on creator_handle_aliases from anon, authenticated;
grant all on creator_handle_aliases to service_role;

-- Storefront product lookups remain fast as the creator catalogue grows.
create index if not exists idx_courses_creator_published
  on courses (instructor_id, published, created_at desc);
create index if not exists idx_designs_creator_published
  on designs (created_by, published, created_at desc);
create index if not exists idx_wealth_creator_published
  on wealth_products (created_by, published, created_at desc);

create or replace function creator_handle_slug(value text)
returns text language sql immutable set search_path = public as $$
  select trim(both '-' from left(
    regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g'),
    30
  ));
$$;

-- Give every existing creator a stable handle. The short UUID suffix is only
-- used when the natural name is unavailable or conflicts with a reserved path.
do $$
declare
  creator record;
  candidate text;
  reserved text[] := array['admin','api','auth','checkout','cookies','courses','dashboard','designs','invite','login','privacy','register','reset-password','terms','tools','wealth'];
begin
  for creator in
    select id, full_name from profiles
    where role = 'teacher' and handle is null
    order by created_at, id
  loop
    candidate := creator_handle_slug(creator.full_name);
    if length(candidate) < 3 or candidate = any(reserved) or exists (
      select 1 from profiles where lower(handle) = lower(candidate)
    ) then
      candidate := left(coalesce(nullif(candidate, ''), 'creator'), 22) || '-' || left(replace(creator.id::text, '-', ''), 7);
    end if;
    update profiles set handle = candidate where id = creator.id;
  end loop;
end $$;

create or replace function assign_creator_handle()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  candidate text;
  reserved text[] := array['admin','api','auth','checkout','cookies','courses','dashboard','designs','invite','login','privacy','register','reset-password','terms','tools','wealth'];
begin
  if new.role = 'teacher' and new.handle is null then
    candidate := creator_handle_slug(new.full_name);
    if length(candidate) < 3 or candidate = any(reserved) or exists (
      select 1 from profiles where lower(handle) = lower(candidate) and id <> new.id
    ) then
      candidate := left(coalesce(nullif(candidate, ''), 'creator'), 22) || '-' || left(replace(new.id::text, '-', ''), 7);
    end if;
    new.handle := candidate;
  end if;
  return new;
end; $$;

drop trigger if exists trg_assign_creator_handle on profiles;
create trigger trg_assign_creator_handle before insert or update of role, full_name, handle on profiles
  for each row execute function assign_creator_handle();

create table if not exists creator_domain_requests (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles(id) on delete cascade,
  requested_domain text not null,
  status text not null default 'pending'
    check (status in ('pending','in_progress','awaiting_dns','ready','rejected','cancelled')),
  admin_notes text not null default '',
  provider_domain_id text,
  verification_data jsonb not null default '{}'::jsonb,
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ready_at timestamptz
);

create unique index if not exists idx_creator_domain_open_domain
  on creator_domain_requests (lower(requested_domain))
  where status not in ('rejected','cancelled');
create unique index if not exists idx_creator_domain_open_creator
  on creator_domain_requests (creator_id)
  where status not in ('rejected','cancelled');
create index if not exists idx_creator_domain_status
  on creator_domain_requests (status, requested_at desc);

drop trigger if exists trg_creator_domain_requests_updated on creator_domain_requests;
create trigger trg_creator_domain_requests_updated before update on creator_domain_requests
  for each row execute function set_updated_at();

alter table creator_domain_requests enable row level security;
revoke all on creator_domain_requests from anon, authenticated;
grant all on creator_domain_requests to service_role;

comment on table creator_domain_requests is
  'Manual creator custom-domain onboarding queue. Middleware routes only ready domains; administrators must verify ownership, DNS, TLS, and deployment attachment first.';
