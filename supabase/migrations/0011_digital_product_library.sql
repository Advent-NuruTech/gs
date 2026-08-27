-- ============================================================================
-- Digital product library
--
-- Keep the original table names for backwards compatibility, but link product
-- purchases to accounts and remember the customer's preferred access method.
-- Existing purchases can still be claimed safely by signing in with the same
-- email address used at checkout; application code performs that lookup.
-- ============================================================================

alter table design_orders
  add column if not exists user_id uuid references profiles(id) on delete set null,
  add column if not exists access_mode text not null default 'download';

do $$ begin
  alter table design_orders
    add constraint design_orders_access_mode_check
    check (access_mode in ('download', 'read_online'));
exception when duplicate_object then null; end $$;

create index if not exists idx_design_orders_user on design_orders(user_id);
create index if not exists idx_design_orders_customer_email on design_orders(lower(email));

-- Users can see successful purchases linked to their account. The email clause
-- makes purchases made before account creation appear after signup/sign-in.
create policy "design_orders customer read own purchases"
  on design_orders for select to authenticated
  using (
    payment_status = 'success'
    and kind = 'download'
    and (
      user_id = auth.uid()
      or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );
