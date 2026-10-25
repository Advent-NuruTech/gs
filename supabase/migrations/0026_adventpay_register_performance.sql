-- AdventPay invoice register performance indexes. Apply after 0025.
-- These keep customer/admin status and recurring-register pages responsive as
-- the invoice history grows beyond thousands of records.
create index if not exists idx_advent_pay_invoices_created_at
  on advent_pay_invoices (created_at desc);

create index if not exists idx_advent_pay_invoices_customer_status_due
  on advent_pay_invoices (customer_id, status, due_date, created_at desc);

create index if not exists idx_advent_pay_invoices_billing_created_at
  on advent_pay_invoices (billing_type, created_at desc);
