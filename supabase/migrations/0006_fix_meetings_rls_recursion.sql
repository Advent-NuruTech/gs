-- ============================================================================
-- 0006 — Fix infinite recursion in meetings RLS
--
-- 0005 created a mutual reference between two SELECT policies:
--   * "meetings"          policy did  EXISTS (select from meeting_invitees ...)
--   * "meeting_invitees"  policy did  EXISTS (select from meetings ...)
-- Reading either table invoked the other table's policy, which invoked the
-- first again — Postgres aborts with
--   "infinite recursion detected in policy for relation meetings".
-- meeting_attendance hit the same cycle via its meetings sub-select.
--
-- Fix: move the cross-table existence checks into SECURITY DEFINER helpers
-- (same pattern as is_admin() / current_user_role()). A SECURITY DEFINER
-- function runs as its owner and is NOT subject to the caller's RLS, so the
-- policy cycle is broken.
-- ============================================================================

-- "Is the current user an explicit invitee of this meeting?" — bypasses RLS.
create or replace function is_meeting_invitee(m_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.meeting_invitees
    where meeting_id = m_id and user_id = auth.uid()
  );
$$;

-- "Does the current user host/own this meeting?" — bypasses RLS.
create or replace function can_manage_meeting(m_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.meetings
    where id = m_id and (created_by = auth.uid() or host_id = auth.uid())
  );
$$;

-- meetings: same visibility rules as 0005, but the invitee check now goes
-- through is_meeting_invitee() instead of a recursive sub-select.
drop policy if exists "meetings visible to audience" on meetings;
create policy "meetings visible to audience"
  on meetings for select to authenticated
  using (
    is_admin()
    or created_by = auth.uid()
    or host_id = auth.uid()
    or (
      meeting_type = 'live_class'
      and exists (
        select 1 from enrollments e
        where e.course_id = meetings.course_id and e.user_id = auth.uid()
      )
    )
    or (
      meeting_type = 'general'
      and (
        audience = 'all'
        or (audience = 'teachers' and current_user_role() = 'teacher')
        or (audience = 'students' and current_user_role() = 'student')
      )
    )
    or is_meeting_invitee(meetings.id)
  );

-- meeting_invitees: host/creator check now goes through can_manage_meeting().
drop policy if exists "meeting_invitees visible to participants" on meeting_invitees;
create policy "meeting_invitees visible to participants"
  on meeting_invitees for select to authenticated
  using (
    user_id = auth.uid()
    or is_admin()
    or can_manage_meeting(meeting_invitees.meeting_id)
  );

-- meeting_attendance: same fix for its host/creator check.
drop policy if exists "meeting_attendance own read" on meeting_attendance;
create policy "meeting_attendance own read"
  on meeting_attendance for select to authenticated
  using (
    user_id = auth.uid()
    or is_admin()
    or can_manage_meeting(meeting_attendance.meeting_id)
  );
