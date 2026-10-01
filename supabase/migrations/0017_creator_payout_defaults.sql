-- Standard creator payout terms: 10% platform commission and creator-borne
-- Paystack processing fees. Existing creator-specific overrides remain intact.
alter table platform_payment_settings
  alter column default_fee_mode set default 'exclusive';

update platform_payment_settings
set default_commission_percent = 10,
    default_fee_mode = 'exclusive',
    updated_at = now()
where id = true;
