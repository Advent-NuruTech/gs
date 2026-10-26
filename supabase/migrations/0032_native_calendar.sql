-- ============================================================================
-- 0032 — Native AdventSkool calendar
-- Removes the Calendar/Meet OAuth integration. Live classes, meetings and
-- reminders remain first-class AdventSkool events with audience-controlled
-- visibility, in-app notifications and an optional host-provided session URL.
-- ============================================================================

-- Preserve links already supplied by Google Meet, but make them provider-neutral.
alter table meetings rename column google_meet_url to meeting_url;
alter table meetings drop column if exists google_event_id;
alter table meetings drop column if exists google_calendar_id;
alter table meetings add column if not exists location text not null default '';

-- Calendar tokens are no longer needed. Dropping this table also permanently
-- removes previously stored OAuth credentials from the platform database.
drop view if exists google_account_status;
drop table if exists google_accounts;

-- Every delivery is uniquely recorded so a scheduled reminder cannot be sent
-- twice, even when the cron endpoint retries.
create table if not exists meeting_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  reminder_offset_minutes integer not null check (reminder_offset_minutes in (60, 1440)),
  occurrence_start timestamptz not null,
  delivered_at timestamptz not null default now(),
  unique (meeting_id, user_id, reminder_offset_minutes, occurrence_start)
);
create index if not exists idx_meeting_reminder_deliveries_lookup
  on meeting_reminder_deliveries(meeting_id, occurrence_start);

alter table meeting_reminder_deliveries enable row level security;
create policy "meeting reminder deliveries visible to recipients"
  on meeting_reminder_deliveries for select to authenticated
  using (user_id = auth.uid() or is_admin() or can_manage_meeting(meeting_id));

grant select on meeting_reminder_deliveries to authenticated;
grant all on meeting_reminder_deliveries to service_role;

-- Ask PostgREST to refresh its schema cache after the renamed column.
notify pgrst, 'reload schema';
