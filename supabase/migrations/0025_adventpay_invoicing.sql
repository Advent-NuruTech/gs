-- AdventPay invoicing enhancements. Apply after 0024_advent_pay.sql.
-- Recurrence is intentionally stored on the invoice; issuing a future invoice
-- remains an explicit administrator action so a customer is never charged or
-- billed unexpectedly.
alter table advent_pay_invoices
  add column if not exists billing_type text not null default 'one_time'
    check (billing_type in ('one_time', 'recurring')),
  add column if not exists recurrence_interval text
    check (recurrence_interval in ('weekly', 'monthly', 'quarterly', 'yearly')),
  add column if not exists receipt_received_from_name text not null default '',
  add column if not exists receipt_received_from_email text not null default '',
  add column if not exists receipt_note text not null default '',
  add column if not exists receipt_updated_at timestamptz;

alter table advent_pay_invoices
  drop constraint if exists advent_pay_recurrence_interval_required;
alter table advent_pay_invoices
  add constraint advent_pay_recurrence_interval_required
  check (
    (billing_type = 'one_time' and recurrence_interval is null)
    or (billing_type = 'recurring' and recurrence_interval is not null)
  );

update advent_pay_invoices
set receipt_received_from_name = customer_name,
    receipt_received_from_email = customer_email
where receipt_received_from_name = '' and receipt_received_from_email = '';

create index if not exists idx_advent_pay_invoices_billing_type
  on advent_pay_invoices (billing_type, due_date);
