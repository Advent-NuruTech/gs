alter table public.serve_student_applications
  add column if not exists country text not null default '',
  add column if not exists city text not null default '';

create table if not exists public.serve_gallery_images (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  caption text not null,
  sort_order integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_serve_gallery_images_order
  on public.serve_gallery_images(sort_order, created_at);

drop trigger if exists trg_serve_gallery_images_updated on public.serve_gallery_images;
create trigger trg_serve_gallery_images_updated
  before update on public.serve_gallery_images
  for each row execute function set_updated_at();

alter table public.serve_gallery_images enable row level security;
grant all on public.serve_gallery_images to service_role;
