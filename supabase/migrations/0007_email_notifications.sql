-- ============================================================================
-- 0007_email_notifications.sql
-- Email Notification System (Resend). PURELY ADDITIVE — does not touch the
-- existing in-app `notifications` table / notificationService / toast system.
--
--   * profiles.marketing_subscribed  — global opt-in (default true)
--   * email_campaigns                — admin-authored campaigns
--   * email_queue                    — per-recipient outbox drained by a cron
--   * trigger on courses publish     — enqueues "new course" emails to users
--                                      who have shown interest in the category
-- ============================================================================

-- 1. Marketing subscription preference ---------------------------------------
alter table profiles
  add column if not exists marketing_subscribed boolean not null default true;

-- Honour the signup checkbox. Extends the existing handle_new_user() trigger
-- function; metadata key defaults to true when absent so behaviour is unchanged
-- for any path that does not send it.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone, role, marketing_subscribed)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student'),
    coalesce((new.raw_user_meta_data->>'marketing_subscribed')::boolean, true)
  )
  on conflict (id) do nothing;
  return new;
end; $$;

-- 2. email_campaigns ---------------------------------------------------------
create table if not exists email_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  html_content text not null default '',                 -- raw body authored by admin
  target_audience text not null default 'all'
    check (target_audience in ('all', 'category')),
  category text,                                          -- free-text course category when target = 'category'
  scheduled_at timestamptz not null default now(),        -- immediate = now() or earlier
  status text not null default 'pending'
    check (status in ('pending', 'queued', 'sent', 'failed', 'canceled')),
  recipients_count integer not null default 0,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_email_campaigns_status on email_campaigns(status, scheduled_at);

create trigger trg_email_campaigns_updated before update on email_campaigns
  for each row execute function set_updated_at();

-- 3. email_queue (outbox) ----------------------------------------------------
-- One row per recipient. The cron processor drains pending rows in small,
-- rate-limited batches. `html` may be precomputed (campaigns); otherwise the
-- processor renders from `template` + `payload` at send time.
create table if not exists email_queue (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references profiles(id) on delete cascade,
  recipient_email text not null,
  subject text not null,
  html text,
  template text,                                          -- 'new_course' | 'promotion' | 'campaign'
  payload jsonb not null default '{}'::jsonb,
  kind text not null default 'campaign'
    check (kind in ('new_course', 'promotion', 'campaign')),
  campaign_id uuid references email_campaigns(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed', 'canceled')),
  attempts integer not null default 0,
  last_error text,
  dedup_key text,                                         -- prevents accidental double-enqueue
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_email_queue_pending on email_queue(status, scheduled_at);
create unique index if not exists uq_email_queue_dedup on email_queue(dedup_key)
  where dedup_key is not null;

-- 4. New-course publish trigger ---------------------------------------------
-- Fires when published flips false -> true. Targets subscribers who have shown
-- interest in the course's category (enrolled in, or successfully paid for, a
-- course in the same category). Enqueues lightweight rows; HTML is rendered by
-- the TypeScript processor so this function stays template-free.
create or replace function enqueue_new_course_emails()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.published = true and coalesce(old.published, false) = false then
    insert into email_queue (
      recipient_id, recipient_email, subject, template, payload, kind, dedup_key
    )
    select distinct
      p.id,
      p.email,
      'New course: ' || new.title,
      'new_course',
      jsonb_build_object(
        'courseId', new.id,
        'title', new.title,
        'thumbnail', new.thumbnail_url,
        'category', new.category,
        'outline', left(coalesce(new.outline, ''), 240)
      ),
      'new_course',
      'new_course:' || new.id::text || ':' || p.id::text
    from profiles p
    where p.marketing_subscribed = true
      and coalesce(p.email, '') <> ''
      and (
        exists (
          select 1 from enrollments e
          join courses c on c.id = e.course_id
          where e.user_id = p.id and c.category = new.category
        )
        or exists (
          select 1 from payments pay
          join courses c2 on c2.id = pay.course_id
          where pay.user_id = p.id and pay.status = 'success' and c2.category = new.category
        )
      )
    on conflict (dedup_key) do nothing;
  end if;
  return new;
end; $$;

drop trigger if exists trg_courses_email_publish on courses;
create trigger trg_courses_email_publish after update on courses
  for each row execute function enqueue_new_course_emails();

-- 4b. Fan-out helpers (security definer so the service-role cron can call them)
-- Enqueue an admin campaign to its target audience. Returns rows enqueued.
create or replace function enqueue_campaign_emails(p_campaign_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  c record;
  n integer := 0;
begin
  select * into c from email_campaigns where id = p_campaign_id;
  if not found then return 0; end if;

  insert into email_queue (
    recipient_id, recipient_email, subject, template, payload, kind, campaign_id, dedup_key
  )
  select distinct
    p.id, p.email, c.subject, 'campaign',
    jsonb_build_object('bodyHtml', c.html_content, 'name', p.full_name),
    'campaign', c.id,
    'campaign:' || c.id::text || ':' || p.id::text
  from profiles p
  where p.marketing_subscribed = true
    and coalesce(p.email, '') <> ''
    and (
      c.target_audience = 'all'
      or (
        c.target_audience = 'category' and (
          exists (
            select 1 from enrollments e join courses co on co.id = e.course_id
            where e.user_id = p.id and co.category = c.category
          )
          or exists (
            select 1 from payments pay join courses co2 on co2.id = pay.course_id
            where pay.user_id = p.id and pay.status = 'success' and co2.category = c.category
          )
        )
      )
    )
  on conflict (dedup_key) do nothing;

  get diagnostics n = row_count;
  update email_campaigns
    set recipients_count = recipients_count + n, status = 'queued'
    where id = p_campaign_id;
  return n;
end; $$;

-- Enqueue a promotion to every subscriber. `p_period` (e.g. '2026-06-H1')
-- makes the dedup_key idempotent within a single send window.
create or replace function enqueue_promotion_emails(p_period text)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer := 0;
begin
  insert into email_queue (
    recipient_id, recipient_email, subject, template, payload, kind, dedup_key
  )
  select distinct
    p.id, p.email, 'New courses & learning picks for you', 'promotion',
    jsonb_build_object('name', p.full_name), 'promotion',
    'promotion:' || p_period || ':' || p.id::text
  from profiles p
  where p.marketing_subscribed = true and coalesce(p.email, '') <> ''
  on conflict (dedup_key) do nothing;
  get diagnostics n = row_count;
  return n;
end; $$;

-- Flip campaigns to 'sent' once none of their queue rows are still pending.
create or replace function mark_drained_campaigns()
returns void language sql security definer set search_path = public as $$
  update email_campaigns c set status = 'sent'
  where c.status = 'queued'
    and not exists (
      select 1 from email_queue q
      where q.campaign_id = c.id and q.status in ('pending', 'sending')
    );
$$;

-- 5. RLS + grants ------------------------------------------------------------
alter table email_campaigns enable row level security;
alter table email_queue enable row level security;

-- Admins author/read campaigns; the cron processor uses the service-role client
-- (which bypasses RLS) for all sends.
create policy "email_campaigns admin all" on email_campaigns
  for all to authenticated using (is_admin()) with check (is_admin());

-- No authenticated policy on email_queue => not readable/writable by end users.
-- Only the service-role processor touches it.

grant select, insert, update, delete on email_campaigns to authenticated;
grant all on email_campaigns, email_queue to service_role;
grant execute on function enqueue_campaign_emails(uuid) to service_role;
grant execute on function enqueue_promotion_emails(text) to service_role;
grant execute on function mark_drained_campaigns() to service_role;

-- ============================================================================
-- 6. Scheduling (Supabase pg_cron + pg_net) — run ONCE in the SQL editor after
--    deploying, replacing <APP_URL> and <CRON_SECRET> with your real values.
--    (Kept commented so this migration is safe to apply repeatedly.)
-- ============================================================================
--
-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;
--
-- -- Drain the outbox every 5 minutes (rate-limited per run inside the route).
-- select cron.schedule(
--   'email-process', '*/5 * * * *',
--   $$ select net.http_post(
--        url     := '<APP_URL>/api/cron/email/process',
--        headers := jsonb_build_object('x-cron-secret', '<CRON_SECRET>')
--      ); $$
-- );
--
-- -- Bi-monthly promotion: 09:00 on the 1st and 15th of every month.
-- select cron.schedule(
--   'email-promotions', '0 9 1,15 * *',
--   $$ select net.http_post(
--        url     := '<APP_URL>/api/cron/email/promotions',
--        headers := jsonb_build_object('x-cron-secret', '<CRON_SECRET>')
--      ); $$
-- );
