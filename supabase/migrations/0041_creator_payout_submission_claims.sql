-- Serialize each creator's payout submissions. Claims are deliberately retained
-- after an uncertain provider response until an operator reconciles Paystack.
create table if not exists creator_payout_submission_claims (
  creator_id uuid primary key references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table creator_payout_submission_claims enable row level security;
revoke all on creator_payout_submission_claims from anon, authenticated;
