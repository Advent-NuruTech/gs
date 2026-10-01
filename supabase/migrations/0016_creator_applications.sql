alter table profiles
  add column if not exists creator_status text not null default 'none'
    check (creator_status in ('none','pending','approved','rejected')),
  add column if not exists whatsapp text not null default '',
  add column if not exists suspended_until timestamptz,
  add column if not exists suspension_reason text;

-- Applicants retain their existing student role until an administrator approves them.
update profiles set creator_status = 'approved' where role = 'teacher' and creator_status = 'none';

-- Signup metadata is client supplied. New accounts always begin as students;
-- teacher access can only be granted by an administrator after review.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone, role, creator_status, whatsapp)
  values (new.id, coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    case when coalesce((new.raw_user_meta_data->>'creator_application')::boolean, false) then 'teacher'::user_role else 'student'::user_role end,
    case when coalesce((new.raw_user_meta_data->>'creator_application')::boolean, false) then 'pending' else 'none' end,
    case when coalesce((new.raw_user_meta_data->>'creator_application')::boolean, false) then coalesce(new.raw_user_meta_data->>'whatsapp', '') else '' end)
  on conflict (id) do nothing;
  return new;
end; $$;

create or replace function protect_profile_access_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() = old.id and not is_admin() then
    new.role := old.role;
    new.creator_status := old.creator_status;
    new.suspended_until := old.suspended_until;
    new.suspension_reason := old.suspension_reason;
  end if;
  return new;
end; $$;
drop trigger if exists trg_protect_profile_access_fields on profiles;
create trigger trg_protect_profile_access_fields before update on profiles
  for each row execute function protect_profile_access_fields();

create or replace function can_manage_creator_content()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'admin' or (p.role = 'teacher' and p.creator_status in ('pending','approved')
        and (p.suspended_until is null or p.suspended_until <= now())))
  );
$$;

drop policy if exists "courses owner insert" on courses;
create policy "courses owner insert" on courses for insert to authenticated
  with check (instructor_id = auth.uid() and can_manage_creator_content() or is_admin());
drop policy if exists "courses owner update" on courses;
create policy "courses owner update" on courses for update to authenticated
  using ((instructor_id = auth.uid() and can_manage_creator_content()) or is_admin())
  with check ((instructor_id = auth.uid() and can_manage_creator_content()) or is_admin());
drop policy if exists "courses owner delete" on courses;
create policy "courses owner delete" on courses for delete to authenticated
  using ((instructor_id = auth.uid() and can_manage_creator_content()) or is_admin());

drop policy if exists "designs owner insert" on designs;
create policy "designs owner insert" on designs for insert to authenticated
  with check ((created_by = auth.uid() and can_manage_creator_content()) or is_admin());
drop policy if exists "designs owner update" on designs;
create policy "designs owner update" on designs for update to authenticated
  using ((created_by = auth.uid() and can_manage_creator_content()) or is_admin())
  with check ((created_by = auth.uid() and can_manage_creator_content()) or is_admin());
drop policy if exists "designs owner delete" on designs;
create policy "designs owner delete" on designs for delete to authenticated
  using ((created_by = auth.uid() and can_manage_creator_content()) or is_admin());
