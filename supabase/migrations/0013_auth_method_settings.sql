-- Admin-managed visibility for the public sign-in and sign-up methods.
create table if not exists auth_method_settings (
  id boolean primary key default true check (id = true),
  google_enabled boolean not null default true,
  email_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into auth_method_settings (id, google_enabled, email_enabled)
values (true, true, true)
on conflict (id) do nothing;

drop trigger if exists trg_auth_method_settings_updated on auth_method_settings;
create trigger trg_auth_method_settings_updated before update on auth_method_settings
  for each row execute function set_updated_at();

alter table auth_method_settings enable row level security;

create policy "auth settings public read"
  on auth_method_settings for select
  to anon, authenticated
  using (true);

create policy "auth settings admin update"
  on auth_method_settings for update
  to authenticated
  using (is_admin())
  with check (is_admin());

grant select on auth_method_settings to anon;
grant select, update on auth_method_settings to authenticated;
grant all on auth_method_settings to service_role;

comment on table auth_method_settings is
  'Singleton configuration controlling which methods appear on public login and registration pages.';
