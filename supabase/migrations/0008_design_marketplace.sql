-- ============================================================================
-- Design Marketplace — thumbnails, posters, flyers, banners, graphics.
-- Free public browsing; paid download + customization. Orders are placed by
-- anonymous visitors (no account required); the order row is created by the
-- service role only after a successful Paystack payment. Mirrors the course
-- payment flow but stores order details up-front and embeds the payment ref.
-- ============================================================================

-- Status of a customization order through fulfillment.
do $$ begin
  create type design_order_status as enum ('pending', 'in_progress', 'completed', 'delivered');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- designs (portfolio samples shown in the public gallery)
-- ============================================================================
create table if not exists designs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category text not null default 'General',
  image_url text not null default '',
  -- Natural pixel dimensions of the uploaded image so the gallery can render
  -- masonry tiles with the correct aspect ratio and never crop.
  image_width integer,
  image_height integer,
  download_price numeric not null default 0,
  customization_price numeric not null default 0,
  published boolean not null default true,
  views integer not null default 0,
  orders_count integer not null default 0,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_designs_published on designs(published);
create index if not exists idx_designs_category on designs(category);
create index if not exists idx_designs_created on designs(created_at desc);

create trigger trg_designs_updated before update on designs
  for each row execute function set_updated_at();

-- ============================================================================
-- design_orders (customization requests; writes: service role only)
-- ============================================================================
create table if not exists design_orders (
  id uuid primary key default gen_random_uuid(),
  design_id uuid references designs(id) on delete set null,
  design_title text not null default '',

  -- Customer information
  full_name text not null default '',
  email text not null default '',
  phone text not null default '',
  whatsapp text not null default '',

  -- Design requirements
  title_text text not null default '',
  subtitle text not null default '',
  instructions text not null default '',
  preferred_colors text not null default '',
  preferred_style text not null default '',

  -- Customer-supplied media (Cloudinary URLs)
  uploaded_images text[] not null default '{}',

  -- Money + payment
  amount numeric not null default 0,
  currency text not null default 'KES',
  paystack_reference text not null unique,
  paystack_access_code text,
  payment_status payment_status not null default 'pending',
  order_status design_order_status not null default 'pending',

  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_design_orders_design on design_orders(design_id);
create index if not exists idx_design_orders_reference on design_orders(paystack_reference);
create index if not exists idx_design_orders_payment_status on design_orders(payment_status);
create index if not exists idx_design_orders_created on design_orders(created_at desc);

create trigger trg_design_orders_updated before update on design_orders
  for each row execute function set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table designs enable row level security;
alter table design_orders enable row level security;

-- designs: anyone can read published designs; owner/admin sees all + writes.
create policy "designs public read published"
  on designs for select using (published or created_by = auth.uid() or is_admin());
create policy "designs owner insert"
  on designs for insert to authenticated with check (created_by = auth.uid() or is_admin());
create policy "designs owner update"
  on designs for update to authenticated using (created_by = auth.uid() or is_admin()) with check (created_by = auth.uid() or is_admin());
create policy "designs owner delete"
  on designs for delete to authenticated using (created_by = auth.uid() or is_admin());

-- design_orders: admin read only. No client writes — the service role creates
-- and updates orders during payment fulfillment and admin status changes.
create policy "design_orders admin read"
  on design_orders for select to authenticated using (is_admin());
create policy "design_orders admin update"
  on design_orders for update to authenticated using (is_admin()) with check (is_admin());

-- ============================================================================
-- Atomic view counter (avoids read-modify-write races). Callable by anyone.
-- ============================================================================
create or replace function increment_design_views(p_design_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.designs set views = views + 1 where id = p_design_id and published;
$$;

-- ============================================================================
-- Grants (tables created as postgres don't inherit dashboard auto-grants).
-- ============================================================================
grant select on designs to anon, authenticated;
grant select, insert, update, delete on designs to authenticated;
grant select, update on design_orders to authenticated;
grant execute on function increment_design_views(uuid) to anon, authenticated;
-- service_role already has `grant all` via 0002 default privileges.
