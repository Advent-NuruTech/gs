-- Public AdventPay links are bearer links. Store only a SHA-256 hash of the
-- random token, so a database read cannot be used to pay an invoice.
alter table advent_pay_invoices
  add column if not exists public_payment_link_enabled boolean not null default false,
  add column if not exists public_payment_token_hash text unique,
  add column if not exists public_payment_link_created_at timestamptz,
  add column if not exists mobile_charge_last_at timestamptz;

alter table advent_pay_invoices
  drop constraint if exists advent_pay_public_link_token_required;
alter table advent_pay_invoices
  add constraint advent_pay_public_link_token_required check (
    (public_payment_link_enabled = false and public_payment_token_hash is null)
    or (public_payment_link_enabled = true and char_length(public_payment_token_hash) = 64)
  );

create index if not exists idx_advent_pay_invoices_public_payment_token
  on advent_pay_invoices (public_payment_token_hash)
  where public_payment_link_enabled = true;
