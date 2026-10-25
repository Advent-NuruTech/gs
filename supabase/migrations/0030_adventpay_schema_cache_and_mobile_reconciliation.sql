-- Repair installations where public-payment-link columns were introduced
-- outside the migration history, then tell PostgREST to refresh its schema
-- cache before the application starts selecting or writing those columns.
alter table public.advent_pay_invoices
  add column if not exists public_payment_link_enabled boolean not null default false,
  add column if not exists public_payment_token_hash text,
  add column if not exists public_payment_link_created_at timestamptz,
  add column if not exists mobile_charge_last_at timestamptz,
  add column if not exists customer_phone text not null default '';

create unique index if not exists advent_pay_invoices_public_payment_token_hash_key
  on public.advent_pay_invoices (public_payment_token_hash)
  where public_payment_token_hash is not null;

create index if not exists idx_advent_pay_invoices_public_payment_token
  on public.advent_pay_invoices (public_payment_token_hash)
  where public_payment_link_enabled = true;

notify pgrst, 'reload schema';
