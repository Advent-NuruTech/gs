-- Notify administrators when a new creator applicant registers through
-- /register/creator (which creates the profile from the auth trigger).
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_creator_application boolean := coalesce((new.raw_user_meta_data->>'creator_application')::boolean, false);
  applicant_name text := coalesce(new.raw_user_meta_data->>'full_name', '');
  applicant_whatsapp text := regexp_replace(coalesce(new.raw_user_meta_data->>'whatsapp', ''), '[^0-9]', '', 'g');
begin
  if is_creator_application and applicant_whatsapp !~ '^254[0-9]{9}$' then
    raise exception 'A valid WhatsApp number with Kenya country code is required for creator applications.';
  end if;

  insert into public.profiles (id, email, full_name, phone, role, creator_status, whatsapp, marketing_subscribed)
  values (new.id, coalesce(new.email, ''), applicant_name,
    case when is_creator_application then '+' || applicant_whatsapp else coalesce(new.raw_user_meta_data->>'phone', '') end,
    case when is_creator_application then 'teacher'::user_role else 'student'::user_role end,
    case when is_creator_application then 'pending' else 'none' end,
    case when is_creator_application then '+' || applicant_whatsapp else '' end,
    coalesce((new.raw_user_meta_data->>'marketing_subscribed')::boolean, true))
  on conflict (id) do nothing;

  if is_creator_application then
    insert into public.notifications (user_id, title, message, link)
    select p.id, 'New creator application',
      coalesce(nullif(applicant_name, ''), 'A new applicant') || ' submitted a creator application for review.',
      '/dashboard/admin/creator-applications'
    from public.profiles p where p.role = 'admin';
  end if;
  return new;
end; $$;
