alter table profiles
  add column if not exists wealth_enabled boolean not null default false;

create table if not exists wealth_settings (
  id text primary key default 'default' check (id = 'default'),
  public_navigation_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_wealth_settings_updated on wealth_settings;
create trigger trg_wealth_settings_updated before update on wealth_settings
  for each row execute function set_updated_at();

insert into wealth_settings (id, public_navigation_enabled)
values ('default', false)
on conflict (id) do nothing;

alter table wealth_settings enable row level security;

drop policy if exists "wealth settings public read" on wealth_settings;
create policy "wealth settings public read"
  on wealth_settings for select to anon, authenticated using (true);
drop policy if exists "wealth settings admin update" on wealth_settings;
create policy "wealth settings admin update"
  on wealth_settings for update to authenticated using (is_admin()) with check (is_admin());

grant select on wealth_settings to anon, authenticated;
grant update on wealth_settings to authenticated;

create or replace function protect_profile_access_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() = old.id and not is_admin() then
    new.role := old.role;
    new.creator_status := old.creator_status;
    new.suspended_until := old.suspended_until;
    new.suspension_reason := old.suspension_reason;
    new.wealth_enabled := old.wealth_enabled;
  end if;
  if new.role <> 'teacher' or new.creator_status <> 'approved' then
    new.wealth_enabled := false;
  end if;
  return new;
end; $$;

create or replace function can_manage_wealth_content()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'admin'
        or (
          p.role = 'teacher'
          and p.creator_status = 'approved'
          and p.wealth_enabled
          and (p.suspended_until is null or p.suspended_until <= now())
        )
      )
  );
$$;

drop policy if exists "wealth_products public read published" on wealth_products;
drop policy if exists "wealth_products owner insert" on wealth_products;
drop policy if exists "wealth_products owner update" on wealth_products;
drop policy if exists "wealth_products owner delete" on wealth_products;

create policy "wealth_products public read published"
  on wealth_products for select using (
    (
      published and (
        created_by is null
        or exists (
          select 1 from profiles creator
          where creator.id = wealth_products.created_by
            and (
              creator.role = 'admin'
              or (
                creator.role = 'teacher'
                and creator.creator_status = 'approved'
                and creator.wealth_enabled
                and (creator.suspended_until is null or creator.suspended_until <= now())
              )
            )
        )
      )
    )
    or (created_by = auth.uid() and can_manage_wealth_content())
    or is_admin()
  );
create policy "wealth_products owner insert"
  on wealth_products for insert to authenticated
  with check ((created_by = auth.uid() and can_manage_wealth_content()) or is_admin());
create policy "wealth_products owner update"
  on wealth_products for update to authenticated
  using ((created_by = auth.uid() and can_manage_wealth_content()) or is_admin())
  with check ((created_by = auth.uid() and can_manage_wealth_content()) or is_admin());
create policy "wealth_products owner delete"
  on wealth_products for delete to authenticated
  using ((created_by = auth.uid() and can_manage_wealth_content()) or is_admin());

grant execute on function can_manage_wealth_content() to authenticated;
