-- ============================================================================
-- Design orders: separate "download" and "customization" purchases.
--
-- Download  = pay the download price, get the full-quality file instantly. No
--             personalisation, no admin work. Delivered the moment payment
--             clears.
-- Customization = pay the customization fee only (no download fee added), then
--             our team produces the personalised design and delivers it.
--
-- `kind` distinguishes the two so the admin work queue and customer flows can
-- treat them differently. Existing rows were combined download+customization
-- orders, so default to 'customization'.
-- ============================================================================
alter table design_orders
  add column if not exists kind text not null default 'customization';

-- Guard against typos; only the two supported kinds are allowed.
do $$ begin
  alter table design_orders
    add constraint design_orders_kind_check check (kind in ('download', 'customization'));
exception when duplicate_object then null; end $$;

create index if not exists idx_design_orders_kind on design_orders(kind);
