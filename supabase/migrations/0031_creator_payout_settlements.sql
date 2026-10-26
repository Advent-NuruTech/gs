-- A split is only marked paid after Paystack reports it in a successful
-- settlement. This keeps the settlement identifier and date as audit evidence
-- while preserving the existing creator-earning ledger.
alter table creator_earnings
  add column if not exists paystack_settlement_id bigint,
  add column if not exists settled_at timestamptz;

create index if not exists idx_creator_earnings_routed_settlements
  on creator_earnings (creator_id, created_at desc)
  where settlement_mode = 'paystack_split' and payout_status = 'routed';

-- Schedule a protected reconciliation regularly. It repairs historical rows
-- and promotes routed earnings to paid only after Paystack reports a successful
-- settlement for the creator subaccount. Replace placeholders before running:
--
-- select cron.schedule(
--   'creator-payout-settlement-reconciliation', '15 */2 * * *',
--   $$select net.http_post(
--     url := '<APP_URL>/api/cron/creator-payout-settlements',
--     headers := jsonb_build_object('x-cron-secret', '<CRON_SECRET>')
--   );$$
-- );
