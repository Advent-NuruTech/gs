-- Public merchandising controls. View tracking remains active for internal
-- analytics even when the public counters are hidden.
create table if not exists public_display_settings (
  id boolean primary key default true check (id),
  show_view_counts boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public_display_settings (id, show_view_counts)
values (true, true)
on conflict (id) do nothing;

drop trigger if exists trg_public_display_settings_updated on public_display_settings;
create trigger trg_public_display_settings_updated before update on public_display_settings
  for each row execute function set_updated_at();

alter table public_display_settings enable row level security;

drop policy if exists "public display settings public read" on public_display_settings;
create policy "public display settings public read"
  on public_display_settings for select to anon, authenticated using (true);

drop policy if exists "public display settings admin update" on public_display_settings;
create policy "public display settings admin update"
  on public_display_settings for update to authenticated using (is_admin()) with check (is_admin());

grant select on public_display_settings to anon, authenticated;
grant update on public_display_settings to authenticated;
grant all on public_display_settings to service_role;

comment on table public_display_settings is
  'Admin-controlled presentation settings for public AdventSkool pages.';
