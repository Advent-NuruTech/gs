-- Retire Wealth Academy access while retaining purchase records for audit.
revoke all on table public.wealth_products, public.wealth_orders, public.wealth_settings from public, anon, authenticated;
revoke execute on function public.increment_wealth_product_views(uuid) from public, anon, authenticated;
revoke execute on function public.can_manage_wealth_content() from public, anon, authenticated;

drop trigger if exists notify_wealth_publication on public.wealth_products;
drop trigger if exists notify_wealth_sale on public.wealth_orders;
