-- Notify administrators once when a creator's course or product first goes live.
create table if not exists public.content_publication_notices (
  content_type text not null,
  content_id uuid not null,
  primary key (content_type, content_id)
);
alter table public.content_publication_notices enable row level security;

create or replace function public.notify_content_publication()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  author_id uuid;
  author_name text;
  kind text;
  destination text;
begin
  if not new.published then return new; end if;
  if tg_op = 'UPDATE' and old.published then return new; end if;
  if tg_table_name = 'courses' then
    author_id := new.instructor_id; kind := 'course'; destination := '/courses/' || new.id;
  elsif tg_table_name = 'designs' then
    author_id := new.created_by; kind := 'digital product'; destination := '/designs/' || new.id;
  else
    author_id := new.created_by; kind := 'Wealth Academy resource'; destination := '/wealth/' || new.id;
  end if;
  if not exists (select 1 from public.profiles where id = author_id and role = 'teacher') then return new; end if;
  insert into public.content_publication_notices values (tg_table_name, new.id) on conflict do nothing;
  if not found then return new; end if;
  select coalesce(nullif(trim(full_name), ''), 'A creator') into author_name from public.profiles where id = author_id;
  insert into public.notifications (user_id, title, message, link)
    select id, 'New ' || kind, author_name || ' added a new ' || kind || ': ' || new.title, destination
    from public.profiles where role = 'admin' and id <> author_id;
  return new;
exception when others then
  raise warning 'Notification delivery failed: %', sqlerrm;
  return new;
end; $$;

create trigger notify_course_publication after insert or update of published on public.courses for each row execute function public.notify_content_publication();
create trigger notify_design_publication after insert or update of published on public.designs for each row execute function public.notify_content_publication();
create trigger notify_wealth_publication after insert or update of published on public.wealth_products for each row execute function public.notify_content_publication();

create policy "notifications own delete" on public.notifications for delete to authenticated using (user_id = auth.uid());
grant delete on public.notifications to authenticated;

-- Inform creators of successful purchases once, including on retries.
create table if not exists public.creator_sale_notices (source text not null, source_id uuid not null, primary key (source, source_id));
alter table public.creator_sale_notices enable row level security;
create or replace function public.notify_creator_sale()
returns trigger language plpgsql security definer set search_path = public as $$
declare creator_id uuid; item_title text; destination text;
begin
  if tg_table_name = 'payments' then
    if new.status <> 'success' then return new; end if;
    select instructor_id, title into creator_id, item_title from public.courses where id = new.course_id;
    destination := '/dashboard/teacher/courses';
  elsif tg_table_name = 'design_orders' then
    if new.payment_status <> 'success' then return new; end if;
    select created_by, title into creator_id, item_title from public.designs where id = new.design_id;
    destination := '/dashboard/teacher';
  else
    if new.payment_status <> 'success' then return new; end if;
    select created_by, title into creator_id, item_title from public.wealth_products where id = new.product_id;
    destination := '/dashboard/teacher/wealth';
  end if;
  if not exists (select 1 from public.profiles where id = creator_id and role = 'teacher') then return new; end if;
  insert into public.creator_sale_notices values (tg_table_name, new.id) on conflict do nothing;
  if not found then return new; end if;
  insert into public.notifications (user_id, title, message, link)
  values (creator_id, 'New sale', 'Someone purchased ' || coalesce(item_title, 'your item') || '.', destination);
  return new;
exception when others then
  raise warning 'Notification delivery failed: %', sqlerrm;
  return new;
end; $$;
create trigger notify_course_sale after insert or update of status on public.payments for each row execute function public.notify_creator_sale();
create trigger notify_design_sale after insert or update of payment_status on public.design_orders for each row execute function public.notify_creator_sale();
create trigger notify_wealth_sale after insert or update of payment_status on public.wealth_orders for each row execute function public.notify_creator_sale();
