-- Creator payout details and an auditable earnings ledger. This migration does
-- not change the existing Paystack checkout or fulfillment implementation.
create table if not exists creator_payout_profiles (
  creator_id uuid primary key references profiles(id) on delete cascade,
  account_holder_name text not null default '',
  bank_name text not null default '',
  bank_code text not null default '',
  account_number text not null default '',
  phone_number text not null default '',
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  payout_status text not null default 'not_configured' check (payout_status in ('not_configured','pending_verification','ready','paused')),
  updated_at timestamptz not null default now()
);

create table if not exists creator_commission_settings (
  creator_id uuid primary key references profiles(id) on delete cascade,
  commission_percent numeric(5,2) not null check (commission_percent >= 0 and commission_percent <= 100),
  fee_mode text not null default 'inclusive' check (fee_mode in ('inclusive','exclusive')),
  updated_at timestamptz not null default now()
);

create table if not exists platform_payment_settings (
  id boolean primary key default true check (id),
  default_commission_percent numeric(5,2) not null default 10 check (default_commission_percent >= 0 and default_commission_percent <= 100),
  default_fee_mode text not null default 'inclusive' check (default_fee_mode in ('inclusive','exclusive')),
  updated_at timestamptz not null default now()
);
insert into platform_payment_settings (id) values (true) on conflict (id) do nothing;

create table if not exists creator_earnings (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique references payments(id) on delete cascade,
  creator_id uuid not null references profiles(id) on delete restrict,
  gross_amount numeric not null,
  commission_percent numeric(5,2) not null,
  fee_mode text not null check (fee_mode in ('inclusive','exclusive')),
  platform_commission numeric not null,
  creator_amount numeric not null,
  provider_fee numeric,
  payout_status text not null default 'pending' check (payout_status in ('pending','paid','on_hold')),
  created_at timestamptz not null default now()
);
create index if not exists idx_creator_earnings_creator on creator_earnings(creator_id, created_at desc);

alter table creator_payout_profiles enable row level security;
alter table creator_commission_settings enable row level security;
alter table platform_payment_settings enable row level security;
alter table creator_earnings enable row level security;

create policy "creator payout owner and admin read" on creator_payout_profiles
  for select to authenticated using (creator_id = auth.uid() or is_admin());
create policy "commission visible to owner and admin" on creator_commission_settings
  for select to authenticated using (creator_id = auth.uid() or is_admin());
create policy "commission admin manage" on creator_commission_settings
  for all to authenticated using (is_admin()) with check (is_admin());
create policy "platform settings admin only" on platform_payment_settings
  for all to authenticated using (is_admin()) with check (is_admin());
create policy "earnings owner and admin read" on creator_earnings
  for select to authenticated using (creator_id = auth.uid() or is_admin());

grant select on creator_payout_profiles, creator_commission_settings, creator_earnings to authenticated;
grant select, insert, update, delete on platform_payment_settings to authenticated;
grant all on creator_payout_profiles, creator_commission_settings,
  platform_payment_settings, creator_earnings to service_role;

-- Snapshot rates only when an existing payment first becomes successful.
-- This trigger adds a ledger record without changing the payment flow.
create or replace function record_creator_earning()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  seller uuid;
  pct numeric(5,2);
  fee text;
  gross numeric;
begin
  if new.status <> 'success' or old.status = 'success' then return new; end if;
  select instructor_id into seller from courses where id = new.course_id;
  if seller is null then return new; end if;
  select coalesce(cs.commission_percent, ps.default_commission_percent, 10),
         coalesce(cs.fee_mode, ps.default_fee_mode, 'inclusive')
    into pct, fee
    from platform_payment_settings ps left join creator_commission_settings cs on cs.creator_id = seller
    where ps.id = true;
  pct := coalesce(pct, 10);
  fee := coalesce(fee, 'inclusive');
  gross := new.amount;
  insert into creator_earnings(payment_id, creator_id, gross_amount, commission_percent,
      fee_mode, platform_commission, creator_amount)
    values(new.id, seller, gross, pct, fee, round(gross * pct / 100, 2),
      gross - round(gross * pct / 100, 2))
    on conflict (payment_id) do nothing;
  return new;
end; $$;
drop trigger if exists trg_record_creator_earning on payments;
create trigger trg_record_creator_earning after update of status on payments
  for each row execute function record_creator_earning();
