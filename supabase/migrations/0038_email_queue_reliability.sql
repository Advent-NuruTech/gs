-- Reliable concurrent email processing. Apply after 0007 and before deploying the new worker.
-- A full unique index permits ON CONFLICT (dedup_key), including for rows with null keys.
drop index if exists public.uq_email_queue_dedup;
create unique index uq_email_queue_dedup on public.email_queue(dedup_key);

alter table public.email_queue add column if not exists lease_id uuid;
alter table public.email_queue add column if not exists leased_at timestamptz;

-- Reclaim interrupted work after five minutes. At most one worker owns a row.
create or replace function public.claim_email_queue_item()
returns setof public.email_queue language plpgsql security definer set search_path = public as $$
begin
  update public.email_queue set status = 'pending', lease_id = null, leased_at = null
  where status = 'sending' and (leased_at is null or leased_at < now() - interval '5 minutes');
  -- Do not deliver queued marketing messages after an account opts out.
  update public.email_queue q set status = 'canceled'
  where q.status = 'pending' and q.recipient_id is not null
    and not exists (select 1 from public.profiles p where p.id = q.recipient_id and p.marketing_subscribed = true);
  return query
    update public.email_queue q set status = 'sending', lease_id = gen_random_uuid(), leased_at = now()
    where q.id = (
      select candidate.id from public.email_queue candidate
      where candidate.status = 'pending' and candidate.scheduled_at <= now()
      order by candidate.scheduled_at, candidate.created_at
      for update skip locked limit 1
    )
    returning q.*;
end; $$;
revoke all on function public.claim_email_queue_item() from public, anon, authenticated;
grant execute on function public.claim_email_queue_item() to service_role;

-- A campaign is failed if any recipient failed; an empty audience is complete.
create or replace function public.mark_drained_campaigns()
returns void language sql security definer set search_path = public as $$
  update public.email_campaigns c
  set status = case when exists (select 1 from public.email_queue q where q.campaign_id = c.id and q.status = 'failed') then 'failed' else 'sent' end
  where c.status = 'queued' and not exists (
    select 1 from public.email_queue q where q.campaign_id = c.id and q.status in ('pending', 'sending')
  );
$$;
revoke all on function public.mark_drained_campaigns() from public, anon, authenticated;
grant execute on function public.mark_drained_campaigns() to service_role;

-- Campaign fan-out is service-only. The row lock prevents overlapping promotion.
create or replace function enqueue_campaign_emails(p_campaign_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  c record;
  n integer := 0;
begin
  select * into c from email_campaigns where id = p_campaign_id for update;
  if not found or c.status <> 'pending' then return 0; end if;

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

revoke all on function public.enqueue_campaign_emails(uuid) from public, anon, authenticated;
grant execute on function public.enqueue_campaign_emails(uuid) to service_role;
revoke all on function public.enqueue_promotion_emails(text) from public, anon, authenticated;
grant execute on function public.enqueue_promotion_emails(text) to service_role;
