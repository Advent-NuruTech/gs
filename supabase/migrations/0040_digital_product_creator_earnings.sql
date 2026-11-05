alter table public.creator_earnings alter column payment_id drop not null;
alter table public.creator_earnings
  add column if not exists design_order_id uuid references public.design_orders(id) on delete restrict;
create unique index if not exists creator_earnings_design_order_unique on public.creator_earnings (design_order_id) where design_order_id is not null;
alter table public.creator_earnings add constraint creator_earnings_one_source_check
  check ((payment_id is not null)::integer + (design_order_id is not null)::integer = 1);

-- Snapshot is created before checkout. This trigger commits the earning and
-- successful order together; retries cannot create a second ledger entry.
create or replace function public.record_design_creator_earning()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  snapshot jsonb;
  seller uuid;
  pct numeric;
  fee text;
  platform_amount numeric;
  route text;
begin
  if new.payment_status <> 'success' or old.payment_status = 'success' then return new; end if;
  snapshot := new.metadata->'creator_payout';
  if snapshot is null then return new; end if;
  seller := nullif(snapshot->>'creator_id', '')::uuid;
  pct := (snapshot->>'commission_percent')::numeric;
  fee := snapshot->>'fee_mode';
  platform_amount := (snapshot->>'platform_amount')::numeric;
  route := snapshot->>'settlement_mode';
  if seller is null or pct is null or pct < 0 or pct > 100
     or fee is null or fee not in ('inclusive','exclusive')
     or route is null or route not in ('paystack_split','platform_only')
     or platform_amount is null or platform_amount < 0 or platform_amount > new.amount then
    raise exception 'Invalid creator payout snapshot for digital product order %', new.id;
  end if;
  insert into creator_earnings(design_order_id, payment_reference, creator_id, gross_amount,
    commission_percent, fee_mode, platform_commission, creator_amount, provider_fee,
    settlement_mode, settlement_status, payout_status)
  values(new.id, new.paystack_reference, seller, new.amount, pct, fee, platform_amount,
    new.amount - platform_amount, (new.metadata->>'provider_fee')::numeric, route,
    case when route = 'paystack_split' then 'split_routed' else 'not_split' end,
    case when route = 'paystack_split' then 'routed' else 'pending' end)
  on conflict (design_order_id) where design_order_id is not null do nothing;
  return new;
end; $$;
create trigger record_design_creator_earning after update of payment_status on public.design_orders
for each row execute function public.record_design_creator_earning();
