-- Advent Pay: account-to-account invoicing. Apply before deploying the UI/API.
create sequence if not exists advent_pay_invoice_number_seq start 1001;

do $$ begin
  create type advent_pay_invoice_status as enum ('pending', 'paid', 'void', 'overdue');
exception when duplicate_object then null; end $$;

do $$ begin
  create type advent_pay_method as enum ('paystack', 'till');
exception when duplicate_object then null; end $$;

create table if not exists advent_pay_settings (
  id boolean primary key default true check (id),
  till_name text not null default '',
  till_number text not null default '',
  till_instructions text not null default '',
  updated_by uuid references profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into advent_pay_settings (id) values (true) on conflict (id) do nothing;

create table if not exists advent_pay_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique default (
    'AP-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('advent_pay_invoice_number_seq')::text, 6, '0')
  ),
  customer_id uuid not null references profiles(id) on delete restrict,
  customer_name text not null default '',
  customer_email text not null default '',
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'KES' check (currency = 'KES'),
  due_date date not null,
  status advent_pay_invoice_status not null default 'pending',
  payment_method advent_pay_method not null,
  till_name_snapshot text not null default '',
  till_number_snapshot text not null default '',
  till_instructions_snapshot text not null default '',
  paystack_reference text unique,
  paystack_access_code text,
  provider_fee numeric(12,2),
  manual_payment_reference text,
  paid_at timestamptz,
  paid_by uuid references profiles(id) on delete set null,
  receipt_number text unique,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint advent_pay_paid_requires_time check (status <> 'paid' or paid_at is not null)
);

create index if not exists idx_advent_pay_invoices_customer on advent_pay_invoices(customer_id, created_at desc);
create index if not exists idx_advent_pay_invoices_status_due on advent_pay_invoices(status, due_date);
create index if not exists idx_advent_pay_invoices_reference on advent_pay_invoices(paystack_reference);
create trigger trg_advent_pay_invoices_updated before update on advent_pay_invoices
  for each row execute function set_updated_at();

alter table advent_pay_settings enable row level security;
alter table advent_pay_invoices enable row level security;

drop policy if exists "advent pay invoices customer read" on advent_pay_invoices;
create policy "advent pay invoices customer read" on advent_pay_invoices
  for select to authenticated using (customer_id = auth.uid() or is_admin());
drop policy if exists "advent pay settings admin read" on advent_pay_settings;
create policy "advent pay settings admin read" on advent_pay_settings
  for select to authenticated using (is_admin());

grant select on advent_pay_invoices, advent_pay_settings to authenticated;
grant all on advent_pay_invoices, advent_pay_settings to service_role;
grant usage, select on sequence advent_pay_invoice_number_seq to service_role;
