-- ============================================================================
-- Wealth Academy — money, wealth preservation, wealth generation, and ending
-- generational poverty.
--
-- This module mirrors the Digital Products marketplace end to end: free public
-- browsing of wealth resources (ebooks, guides, workbooks, courses/resources),
-- paid read-online or download, and optional personalized requests. Orders are
-- created and updated by the service role only; payments run through Paystack.
-- It is intentionally isolated from the design marketplace so neither module
-- can affect the other.
-- ============================================================================

-- Status of a wealth order through fulfillment.
do $$ begin
  create type wealth_order_status as enum ('pending', 'in_progress', 'completed', 'delivered');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- wealth_products (wealth resources shown in the public academy)
-- ============================================================================
create table if not exists wealth_products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category text not null default 'General',
  image_url text not null default '',
  -- Natural pixel dimensions of the uploaded image so the gallery renders the
  -- correct aspect ratio and never crops.
  image_width integer,
  image_height integer,
  -- The original deliverable served on download (PDF or full-quality image).
  file_url text,
  -- "image" (default) or "pdf" — drives badges and download delivery.
  file_type text not null default 'image',
  -- Total pages for a PDF resource — drives the free quarter-of-pages preview.
  page_count integer,
  download_price numeric not null default 0,
  -- When false, personalized-request options are hidden from the public pages.
  customization_enabled boolean not null default true,
  customization_price numeric not null default 0,
  published boolean not null default true,
  views integer not null default 0,
  orders_count integer not null default 0,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_wealth_products_published on wealth_products(published);
create index if not exists idx_wealth_products_category on wealth_products(category);
create index if not exists idx_wealth_products_created on wealth_products(created_at desc);

create trigger trg_wealth_products_updated before update on wealth_products
  for each row execute function set_updated_at();

-- ============================================================================
-- wealth_orders (purchases / personalized requests; writes: service role only)
-- ============================================================================
create table if not exists wealth_orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references wealth_products(id) on delete set null,
  product_title text not null default '',

  -- "download" = pay and get the file/library access instantly.
  -- "customization" = pay a separate fee for a personalized plan/resource.
  kind text not null default 'customization',
  access_mode text not null default 'download',
  user_id uuid references profiles(id) on delete set null,

  -- Customer information
  full_name text not null default '',
  email text not null default '',
  phone text not null default '',
  whatsapp text not null default '',

  -- Personalized-request requirements
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
  order_status wealth_order_status not null default 'pending',

  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wealth_orders_kind_check check (kind in ('download', 'customization')),
  constraint wealth_orders_access_mode_check check (access_mode in ('download', 'read_online'))
);
create index if not exists idx_wealth_orders_product on wealth_orders(product_id);
create index if not exists idx_wealth_orders_reference on wealth_orders(paystack_reference);
create index if not exists idx_wealth_orders_payment_status on wealth_orders(payment_status);
create index if not exists idx_wealth_orders_kind on wealth_orders(kind);
create index if not exists idx_wealth_orders_user on wealth_orders(user_id);
create index if not exists idx_wealth_orders_customer_email on wealth_orders(lower(email));
create index if not exists idx_wealth_orders_created on wealth_orders(created_at desc);

create trigger trg_wealth_orders_updated before update on wealth_orders
  for each row execute function set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table wealth_products enable row level security;
alter table wealth_orders enable row level security;

-- wealth_products: anyone can read published products; owner/admin sees all + writes.
create policy "wealth_products public read published"
  on wealth_products for select using (published or created_by = auth.uid() or is_admin());
create policy "wealth_products owner insert"
  on wealth_products for insert to authenticated with check (created_by = auth.uid() or is_admin());
create policy "wealth_products owner update"
  on wealth_products for update to authenticated using (created_by = auth.uid() or is_admin()) with check (created_by = auth.uid() or is_admin());
create policy "wealth_products owner delete"
  on wealth_products for delete to authenticated using (created_by = auth.uid() or is_admin());

-- wealth_orders: admin read/update only. No client writes — the service role
-- creates and updates orders during payment fulfillment and admin status changes.
create policy "wealth_orders admin read"
  on wealth_orders for select to authenticated using (is_admin());
create policy "wealth_orders admin update"
  on wealth_orders for update to authenticated using (is_admin()) with check (is_admin());

-- Users can see successful purchases linked to their account. The email clause
-- makes purchases made before account creation appear after signup/sign-in.
create policy "wealth_orders customer read own purchases"
  on wealth_orders for select to authenticated
  using (
    payment_status = 'success'
    and kind = 'download'
    and (
      user_id = auth.uid()
      or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

-- ============================================================================
-- Atomic view counter (avoids read-modify-write races). Callable by anyone.
-- ============================================================================
create or replace function increment_wealth_product_views(p_product_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.wealth_products set views = views + 1 where id = p_product_id and published;
$$;

-- ============================================================================
-- Grants (tables created as postgres don't inherit dashboard auto-grants).
-- ============================================================================
grant select on wealth_products to anon, authenticated;
grant select, insert, update, delete on wealth_products to authenticated;
grant select, update on wealth_orders to authenticated;
grant execute on function increment_wealth_product_views(uuid) to anon, authenticated;
-- service_role already has `grant all` via 0002 default privileges.
