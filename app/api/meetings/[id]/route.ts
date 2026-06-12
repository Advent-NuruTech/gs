import { NextRequest, NextResponse } from "next/server";

import { getRequestUser, RequestUser } from "@/lib/api/requireUser";
import { deleteCalendarEvent, updateCalendarEvent } from "@/lib/google/calendar";
import { getGoogleConnection } from "@/lib/google/tokens";
import { notifyUsers, resolveAudience, MeetingAudience, MeetingType } from "@/lib/meetings/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface MeetingRow {
  id: string;
  title: string;
  description: string;
  meeting_type: MeetingType;
  audience: MeetingAudience;
  course_id: string | null;
  created_by: string;
  host_id: string;
  start_time: string;
  end_time: string;
  timezone: string;
  recurrence_rule: string | null;
  google_event_id: string | null;
  google_calendar_id: string;
  google_meet_url: string | null;
  status: string;
}

async function loadMeetingForManager(
  id: string,
  user: RequestUser,
): Promise<MeetingRow | NextResponse> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase.from("meetings").select("*").eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
  const meeting = data as unknown as MeetingRow;
  const canManage =
    user.role === "admin" || meeting.created_by === user.id || meeting.host_id === user.id;
  if (!canManage) {
    return NextResponse.json({ error: "You cannot manage this meeting." }, { status: 403 });
  }
  return meeting;
}

/** Edit / reschedule a meeting, keeping Google Calendar in sync. */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const { id } = await ctx.params;
  const result = await loadMeetingForManager(id, user);
  if (result instanceof NextResponse) return result;
  const meeting = result;

  if (meeting.status === "cancelled") {
    return NextResponse.json({ error: "This meeting was cancelled." }, { status: 409 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const next = {
    title: typeof body.title === "string" && body.title.trim() ? body.title.trim() : meeting.title,
    description:
      typeof body.description === "string" ? body.description : meeting.description,
    startTime:
      typeof body.startTime === "string" && !Number.isNaN(new Date(body.startTime).getTime())
        ? new Date(body.startTime).toISOString()
        : meeting.start_time,
    endTime:
      typeof body.endTime === "string" && !Number.isNaN(new Date(body.endTime).getTime())
        ? new Date(body.endTime).toISOString()
        : meeting.end_time,
    timezone: typeof body.timezone === "string" && body.timezone ? body.timezone : meeting.timezone,
    recurrenceRule:
      typeof body.recurrenceRule === "string" && body.recurrenceRule.startsWith("RRULE:")
        ? body.recurrenceRule
        : body.recurrenceRule === null
          ? null
          : meeting.recurrence_rule,
  };
  if (new Date(next.endTime).getTime() <= new Date(next.startTime).getTime()) {
    return NextResponse.json({ error: "End time must be after the start time." }, { status: 400 });
  }

  // Sync Google Calendar on the host's account.
  if (meeting.google_event_id) {
    const google = await getGoogleConnection(meeting.host_id);
    if (!google) {
      return NextResponse.json(
        { error: "The host's Google account is no longer connected." },
        { status: 409 },
      );
    }
    const audience = await resolveAudience(user, {
      meetingType: meeting.meeting_type,
      audience: meeting.audience,
      courseId: meeting.course_id,
      inviteeIds: [],
    });
    const inviteeEmails =
      meeting.meeting_type === "custom" ? await customInviteeEmails(meeting.id) : audience.emails;
    try {
      await updateCalendarEvent(google.accessToken, meeting.google_calendar_id, meeting.google_event_id, {
        title: next.title,
        description: next.description,
        start: next.startTime,
        end: next.endTime,
        timezone: next.timezone,
        attendeeEmails:
          meeting.meeting_type === "reminder" ? [] : [google.googleEmail || user.email, ...inviteeEmails],
        recurrenceRule: next.recurrenceRule,
        withMeet: false,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Google Calendar update failed." },
        { status: 502 },
      );
    }
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("meetings")
    .update({
      title: next.title,
      description: next.description,
      start_time: next.startTime,
      end_time: next.endTime,
      timezone: next.timezone,
      recurrence_rule: next.recurrenceRule,
    })
    .eq("id", meeting.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Tell the audience about the reschedule.
  if (meeting.meeting_type !== "reminder") {
    const audience = await resolveAudience(user, {
      meetingType: meeting.meeting_type,
      audience: meeting.audience,
      courseId: meeting.course_id,
      inviteeIds: meeting.meeting_type === "custom" ? await customInviteeIds(meeting.id) : [],
    });
    const when = new Date(next.startTime).toLocaleString("en-KE", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: next.timezone,
    });
    await notifyUsers(audience.userIds, {
      title: "Meeting updated",
      message: `${next.title} — now ${when}`,
    });
  }

  return NextResponse.json({ ok: true });
}

/** Cancel a meeting and remove it from Google Calendar. */
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const { id } = await ctx.params;
  const result = await loadMeetingForManager(id, user);
  if (result instanceof NextResponse) return result;
  const meeting = result;

  if (meeting.google_event_id) {
    const google = await getGoogleConnection(meeting.host_id);
    if (google) {
      try {
        await deleteCalendarEvent(google.accessToken, meeting.google_calendar_id, meeting.google_event_id);
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Google Calendar delete failed." },
          { status: 502 },
        );
      }
    }
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("meetings")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", meeting.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (meeting.meeting_type !== "reminder") {
    const audience = await resolveAudience(user, {
      meetingType: meeting.meeting_type,
      audience: meeting.audience,
      courseId: meeting.course_id,
      inviteeIds: meeting.meeting_type === "custom" ? await customInviteeIds(meeting.id) : [],
    });
    await notifyUsers(audience.userIds, {
      title: "Meeting cancelled",
      message: `${meeting.title} has been cancelled.`,
    });
  }

  return NextResponse.json({ ok: true });
}

async function customInviteeEmails(meetingId: string): Promise<string[]> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("meeting_invitees")
    .select("email")
    .eq("meeting_id", meetingId);
  return ((data ?? []) as Array<{ email: string }>).map((row) => row.email).filter(Boolean);
}

async function customInviteeIds(meetingId: string): Promise<string[]> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("meeting_invitees")
    .select("user_id")
    .eq("meeting_id", meetingId);
  return ((data ?? []) as Array<{ user_id: string }>).map((row) => String(row.user_id));
}
