-- ============================================================================
-- Role grants for PostgREST. RLS (in 0001) governs which ROWS are visible;
-- these GRANTs govern table-level access per Supabase role. Tables created via
-- SQL (as postgres) don't inherit the dashboard's auto-grants, so set them here.
-- ============================================================================

grant usage on schema public to anon, authenticated, service_role;

-- anon: only the genuinely public surfaces (RLS still filters rows).
grant select on courses to anon;
grant select on payment_plans to anon;

-- authenticated users: full DML; RLS in 0001 restricts to their own rows
-- and blocks writes to payments / lesson_unlocks (service-role only).
grant select, insert, update, delete on
  profiles, courses, lessons, enrollments, payments, payment_plans,
  lesson_unlocks, notifications, teacher_invites, quiz_attempts
to authenticated;

-- service_role bypasses RLS and performs trusted fulfillment writes.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Ensure future tables created by postgres also grant to API roles.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
