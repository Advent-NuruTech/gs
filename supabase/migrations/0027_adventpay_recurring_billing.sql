-- AdventPay recurring billing schedules. Apply after 0026.
--
-- A recurring invoice is now a billing series, rather than a label on one
-- invoice. Each period remains its own payable/auditable invoice, which means
-- a late payment never moves the following weekly, monthly, quarterly, or
-- yearly due date.
alter table advent_pay_invoices
  add column if not exists recurring_series_id uuid,
  add column if not exists recurrence_anchor_date date;

-- Existing recurring invoices become the first invoice in their own series.
-- This is deliberately non-destructive: it does not fabricate historical
-- invoices. The application will create missed periods from the anchor date.
update advent_pay_invoices
set recurring_series_id = id,
    recurrence_anchor_date = due_date
where billing_type = 'recurring'
  and (recurring_series_id is null or recurrence_anchor_date is null);

alter table advent_pay_invoices
  drop constraint if exists advent_pay_recurring_series_required;
alter table advent_pay_invoices
  add constraint advent_pay_recurring_series_required
  check (
    (billing_type = 'one_time' and recurring_series_id is null and recurrence_anchor_date is null)
    or (
      billing_type = 'recurring'
      and recurring_series_id is not null
      and recurrence_anchor_date is not null
    )
  );

-- Prevent two workers (for example the cron and a dashboard request) from
-- issuing the same period twice. NULL permits any number of one-time invoices.
alter table advent_pay_invoices
  drop constraint if exists advent_pay_invoices_series_due_key;
alter table advent_pay_invoices
  add constraint advent_pay_invoices_series_due_key unique (recurring_series_id, due_date);

create index if not exists idx_advent_pay_invoices_recurring_series_due
  on advent_pay_invoices (recurring_series_id, due_date)
  where recurring_series_id is not null;

-- Schedule POST /api/cron/advent-pay/recurring once daily using the same
-- x-cron-secret / CRON_SECRET protection as the existing email cron. Example:
-- select cron.schedule(
--   'adventpay-recurring-billing', '5 0 * * *',
--   $$select net.http_post(
--     url := '<APP_URL>/api/cron/advent-pay/recurring',
--     headers := jsonb_build_object('x-cron-secret', '<CRON_SECRET>')
--   );$$
-- );
