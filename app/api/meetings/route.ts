import { NextRequest, NextResponse } from "next/server";

import { getRequestUser } from "@/lib/api/requireUser";
import { createCalendarEvent } from "@/lib/google/calendar";
import { getGoogleConnection } from "@/lib/google/tokens";
import {
  checkCreatePermission,
  notifyUsers,
  parseMeetingInput,
  resolveAudience,
} from "@/lib/meetings/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Create a meeting / live class / personal reminder.
 * Creates the Google Calendar event (with a Meet link for real meetings) on
 * the host's calendar, then stores the mapping in Supabase. Attendees get
 * Google Calendar invitations + reminders automatically.
 */
export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const input = parseMeetingInput(body);
  if (typeof input === "string") {
    return NextResponse.json({ error: input }, { status: 400 });
  }

  const permissionError = await checkCreatePermission(user, input);
  if (permissionError) {
    return NextResponse.json({ error: permissionError }, { status: 403 });
  }

  const isReminder = input.meetingType === "reminder";
  const google = await getGoogleConnection(user.id);
  if (!google && !isReminder) {
    return NextResponse.json(
      { error: "Connect your Google account first (Account → Google Calendar)." },
      { status: 409 },
    );
  }

  const audience = await resolveAudience(user, input);

  // 1. Google Calendar event (Meet link for everything except reminders).
  let googleEventId: string | null = null;
  let meetUrl: string | null = null;
  if (google) {
    try {
      const event = await createCalendarEvent(google.accessToken, "primary", {
        title: input.title,
        description: input.description,
        start: input.startTime,
        end: input.endTime,
        timezone: input.timezone,
        attendeeEmails: isReminder ? [] : [user.email, ...audience.emails],
        recurrenceRule: input.recurrenceRule,
        withMeet: !isReminder,
      });
      googleEventId = event.eventId;
      meetUrl = event.meetUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google Calendar call failed.";
      if (!isReminder) {
        return NextResponse.json({ error: message }, { status: 502 });
      }
      // Reminders still work in-app even when the calendar call fails.
    }
  }

  // 2. Persist the meeting.
  const supabase = getSupabaseAdminClient();
  const { data: meeting, error } = await supabase
    .from("meetings")
    .insert({
      title: input.title,
      description: input.description,
      meeting_type: input.meetingType,
      audience: input.audience,
      course_id: input.courseId,
      created_by: user.id,
      host_id: user.id,
      start_time: input.startTime,
      end_time: input.endTime,
      timezone: input.timezone,
      recurrence_rule: input.recurrenceRule,
      google_event_id: googleEventId,
      google_meet_url: meetUrl,
    })
    .select("id")
    .single();
  if (error || !meeting) {
    return NextResponse.json(
      { error: error?.message ?? "Could not save the meeting." },
      { status: 400 },
    );
  }
  const meetingId = String(meeting.id);

  // 3. Explicit invitees (custom meetings).
  if (input.meetingType === "custom" && audience.userIds.length > 0) {
    const { data: invitees } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", audience.userIds);
    await supabase.from("meeting_invitees").insert(
      ((invitees ?? []) as Array<{ id: string; email: string }>).map((row) => ({
        meeting_id: meetingId,
        user_id: row.id,
        email: row.email,
      })),
    );
  }

  // 4. In-app notifications for the audience.
  if (!isReminder) {
    const when = new Date(input.startTime).toLocaleString("en-KE", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: input.timezone,
    });
    await notifyUsers(audience.userIds, {
      title: input.meetingType === "live_class" ? "New live class scheduled" : "New meeting scheduled",
      message: `${input.title} — ${when}`,
    });
  }

  return NextResponse.json({ id: meetingId, meetUrl, googleEventId });
}
