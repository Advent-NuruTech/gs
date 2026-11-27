create table if not exists public.serve_library_items (
  item_type text not null check (item_type in ('course', 'design')),
  item_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (item_type, item_id)
);

alter table public.serve_library_items enable row level security;
grant all on public.serve_library_items to service_role;
