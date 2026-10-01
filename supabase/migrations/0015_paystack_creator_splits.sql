-- Paystack subaccounts route creator shares during checkout. Bank account
-- numbers are sent directly to Paystack and are not stored in AdventSkool.
alter table creator_payout_profiles
  add column if not exists paystack_subaccount_code text,
  add column if not exists account_last4 text not null default '';

-- The earlier payout form could store raw account numbers, but it never made
-- Paystack subaccounts. Keep only a masked suffix and ask those creators to
-- submit their details once more to register the actual Paystack destination.
update creator_payout_profiles
set account_last4 = right(account_number, 4),
    account_number = '',
    verification_status = 'pending',
    payout_status = 'pending_verification'
where account_number <> '' and paystack_subaccount_code is null;

-- Do not let browser clients read this table directly. Payout APIs use the
-- service role and only return masked account details.
revoke all on creator_payout_profiles from authenticated;

alter table creator_earnings
  add column if not exists payment_reference text,
  add column if not exists settlement_mode text not null default 'legacy'
    check (settlement_mode in ('paystack_split','platform_only','legacy')),
  add column if not exists settlement_status text not null default 'not_split'
    check (settlement_status in ('not_split','split_routed','split_confirmed'));

update creator_earnings e set payment_reference = p.paystack_reference
from payments p where p.id = e.payment_id and e.payment_reference is null;

alter table creator_earnings drop constraint if exists creator_earnings_payout_status_check;
alter table creator_earnings add constraint creator_earnings_payout_status_check
  check (payout_status in ('pending','paid','on_hold','routed'));

-- Replace the first version's snapshot trigger. Checkout now writes the rate,
-- amount, fee policy, and settlement mode into the payment before redirecting.
create or replace function record_creator_earning()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  seller uuid;
  snapshot jsonb;
  pct numeric(5,2);
  fee text;
  gross numeric;
  platform_amount numeric;
  route text;
begin
  if new.status <> 'success' or old.status = 'success' then return new; end if;
  snapshot := new.metadata->'creator_payout';
  if snapshot is null then return new; end if;
  seller := nullif(snapshot->>'creator_id', '')::uuid;
  if seller is null then return new; end if;
  pct := (snapshot->>'commission_percent')::numeric;
  fee := snapshot->>'fee_mode';
  gross := new.amount;
  platform_amount := (snapshot->>'platform_amount')::numeric;
  route := snapshot->>'settlement_mode';
  if pct is null or pct < 0 or pct > 100 or fee is null or fee not in ('inclusive','exclusive')
     or route is null or route not in ('paystack_split','platform_only')
     or platform_amount is null or platform_amount < 0 or platform_amount > gross then
    raise exception 'Invalid creator payout snapshot for payment %', new.id;
  end if;
  insert into creator_earnings(payment_id, payment_reference, creator_id, gross_amount, commission_percent,
      fee_mode, platform_commission, creator_amount, settlement_mode, settlement_status,
      payout_status)
    values(new.id, new.paystack_reference, seller, gross, pct, fee, platform_amount,
      gross - platform_amount, route,
      case when route = 'paystack_split' then 'split_routed' else 'not_split' end,
      case when route = 'paystack_split' then 'routed' else 'pending' end)
    on conflict (payment_id) do nothing;
  return new;
end; $$;
