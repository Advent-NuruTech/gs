-- Admin-managed homepage hero. Separate desktop and mobile assets preserve
-- image quality while the public carousel keeps a fixed rotation speed.
create table if not exists home_hero_settings (
  id boolean primary key default true check (id),
  primary_cta_label text not null default 'Explore courses' check (char_length(primary_cta_label) between 1 and 40),
  primary_cta_href text not null default '/courses' check (char_length(primary_cta_href) between 1 and 500 and ((left(primary_cta_href, 1) = '/' and left(primary_cta_href, 2) <> '//') or primary_cta_href like 'https://%')),
  secondary_cta_label text not null default 'Explore products' check (char_length(secondary_cta_label) between 1 and 40),
  secondary_cta_href text not null default '/designs' check (char_length(secondary_cta_href) between 1 and 500 and ((left(secondary_cta_href, 1) = '/' and left(secondary_cta_href, 2) <> '//') or secondary_cta_href like 'https://%')),
  updated_at timestamptz not null default now()
);

insert into home_hero_settings (id)
values (true)
on conflict (id) do nothing;

create table if not exists home_hero_slides (
  id uuid primary key default gen_random_uuid(),
  desktop_image_url text not null,
  mobile_image_url text not null,
  alt_text text not null default 'AdventSkool learning experience' check (char_length(alt_text) between 1 and 180),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into home_hero_slides (desktop_image_url, mobile_image_url, alt_text, sort_order)
select seed.desktop_image_url, seed.mobile_image_url, seed.alt_text, seed.sort_order
from (values
  ('/images/hero/adventskool-learn.png', '/images/hero/adventskool-learn-mobile-v2.png', 'Learning online with AdventSkool on a laptop', 10),
  ('/images/hero/adventskool-create.png', '/images/hero/adventskool-create-mobile-v2.png', 'Creating digital work with a tablet and stylus', 20),
  ('/images/hero/adventskool-grow.png', '/images/hero/adventskool-grow-mobile-v2.png', 'Learning from a phone with headphones', 30),
  ('/images/hero/adventskool-sell.png', '/images/hero/adventskool-sell-mobile-v2.png', 'Presenting a finished digital resource on a tablet', 40)
) as seed(desktop_image_url, mobile_image_url, alt_text, sort_order)
where not exists (select 1 from home_hero_slides);

create or replace function enforce_home_hero_slide_limit()
returns trigger language plpgsql set search_path = public as $$
begin
  if (select count(*) from home_hero_slides) >= 10 then
    raise exception 'The homepage hero supports a maximum of 10 slides.';
  end if;
  return new;
end;
$$;

create or replace function keep_one_home_hero_slide()
returns trigger language plpgsql set search_path = public as $$
begin
  if (select count(*) from home_hero_slides) <= 1 then
    raise exception 'Upload a replacement before deleting the final hero slide.';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_home_hero_slide_limit on home_hero_slides;
create trigger trg_home_hero_slide_limit before insert on home_hero_slides
  for each row execute function enforce_home_hero_slide_limit();

drop trigger if exists trg_keep_one_home_hero_slide on home_hero_slides;
create trigger trg_keep_one_home_hero_slide before delete on home_hero_slides
  for each row execute function keep_one_home_hero_slide();

drop trigger if exists trg_home_hero_settings_updated on home_hero_settings;
create trigger trg_home_hero_settings_updated before update on home_hero_settings
  for each row execute function set_updated_at();

drop trigger if exists trg_home_hero_slides_updated on home_hero_slides;
create trigger trg_home_hero_slides_updated before update on home_hero_slides
  for each row execute function set_updated_at();

alter table home_hero_settings enable row level security;
alter table home_hero_slides enable row level security;

create policy "home hero settings public read" on home_hero_settings
  for select to anon, authenticated using (true);
create policy "home hero settings admin update" on home_hero_settings
  for update to authenticated using (is_admin()) with check (is_admin());

create policy "home hero slides public read" on home_hero_slides
  for select to anon, authenticated using (true);
create policy "home hero slides admin insert" on home_hero_slides
  for insert to authenticated with check (is_admin());
create policy "home hero slides admin update" on home_hero_slides
  for update to authenticated using (is_admin()) with check (is_admin());
create policy "home hero slides admin delete" on home_hero_slides
  for delete to authenticated using (is_admin());

grant select on home_hero_settings, home_hero_slides to anon, authenticated;
grant update on home_hero_settings to authenticated;
grant insert, update, delete on home_hero_slides to authenticated;
grant all on home_hero_settings, home_hero_slides to service_role;

comment on table home_hero_slides is
  'Up to ten admin-managed homepage hero slides with dedicated desktop and mobile images.';
