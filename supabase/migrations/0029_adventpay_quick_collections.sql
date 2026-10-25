-- Quick collection links and phone prompts do not require a registered
-- AdventPay customer. Customer contact fields remain optional and the admin
-- service role is the only writer for these rows.
alter table advent_pay_invoices
  alter column customer_id drop not null,
  add column if not exists customer_phone text not null default '';

create index if not exists idx_advent_pay_invoices_mobile_prompt_phone
  on advent_pay_invoices (customer_phone, mobile_charge_last_at desc)
  where customer_phone <> '' and mobile_charge_last_at is not null;
alter table public.advent_pay_invoices
  alter column customer_id drop not null,
  add column if not exists customer_phone text not null default '',
  add column if not exists mobile_charge_last_at timestamptz;

create index if not exists idx_advent_pay_invoices_mobile_prompt_phone
  on public.advent_pay_invoices (customer_phone, mobile_charge_last_at desc)
  where customer_phone <> '' and mobile_charge_last_at is not null;