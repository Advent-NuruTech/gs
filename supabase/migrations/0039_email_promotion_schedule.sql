-- One automatic promotion per half-month, even when cron executions overlap.
create table if not exists public.email_promotion_runs (
  period text primary key,
  enqueued integer not null,
  created_at timestamptz not null default now()
);
alter table public.email_promotion_runs enable row level security;
revoke all on public.email_promotion_runs from public, anon, authenticated;
grant all on public.email_promotion_runs to service_role;

create or replace function public.enqueue_scheduled_promotion(p_period text)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  perform pg_advisory_xact_lock(hashtext('email-promotion:' || p_period));
  if exists (select 1 from public.email_promotion_runs where period = p_period) then
    return 0;
  end if;
  n := public.enqueue_promotion_emails(p_period);
  insert into public.email_promotion_runs (period, enqueued) values (p_period, n);
  return n;
end; $$;
revoke all on function public.enqueue_scheduled_promotion(text) from public, anon, authenticated;
grant execute on function public.enqueue_scheduled_promotion(text) to service_role;
