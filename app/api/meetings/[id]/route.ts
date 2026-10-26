import { NextRequest, NextResponse } from "next/server";

import { getRequestUser, RequestUser } from "@/lib/api/requireUser";
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
  location: string;
  meeting_url: string | null;
  recurrence_rule: string | null;
  status: string;
}

async function loadMeetingForManager(id: string, user: RequestUser): Promise<MeetingRow | NextResponse> {
  const { data } = await getSupabaseAdminClient().from("meetings").select("*").eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ error: "Calendar event not found." }, { status: 404 });
  const meeting = data as unknown as MeetingRow;
  if (user.role !== "admin" && meeting.created_by !== user.id && meeting.host_id !== user.id) {
    return NextResponse.json({ error: "You cannot manage this calendar event." }, { status: 403 });
  }
  return meeting;
}

function validMeetingUrl(value: string | null): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Edit/reschedule a platform calendar event, then notify its audience. */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { id } = await ctx.params;
  const result = await loadMeetingForManager(id, user);
  if (result instanceof NextResponse) return result;
  const meeting = result;
  if (meeting.status === "cancelled") return NextResponse.json({ error: "This event was cancelled." }, { status: 409 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const next = {
    title: typeof body.title === "string" && body.title.trim() ? body.title.trim() : meeting.title,
    description: typeof body.description === "string" ? body.description : meeting.description,
    startTime: typeof body.startTime === "string" && !Number.isNaN(new Date(body.startTime).getTime()) ? new Date(body.startTime).toISOString() : meeting.start_time,
    endTime: typeof body.endTime === "string" && !Number.isNaN(new Date(body.endTime).getTime()) ? new Date(body.endTime).toISOString() : meeting.end_time,
    timezone: typeof body.timezone === "string" && body.timezone ? body.timezone : meeting.timezone,
    location: typeof body.location === "string" ? body.location.trim().slice(0, 200) : meeting.location,
    meetingUrl: body.meetingUrl === null ? null : typeof body.meetingUrl === "string" ? body.meetingUrl.trim() || null : meeting.meeting_url,
    recurrenceRule: typeof body.recurrenceRule === "string" && body.recurrenceRule.startsWith("RRULE:") ? body.recurrenceRule : body.recurrenceRule === null ? null : meeting.recurrence_rule,
  };
  if (new Date(next.endTime).getTime() <= new Date(next.startTime).getTime()) {
    return NextResponse.json({ error: "End time must be after start time." }, { status: 400 });
  }
  if (!validMeetingUrl(next.meetingUrl)) return NextResponse.json({ error: "Enter a valid session link." }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("meetings").update({
    title: next.title,
    description: next.description,
    start_time: next.startTime,
    end_time: next.endTime,
    timezone: next.timezone,
    location: next.location,
    meeting_url: next.meetingUrl,
    recurrence_rule: next.recurrenceRule,
  }).eq("id", meeting.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (meeting.meeting_type !== "reminder") {
    const audience = await resolveAudience(user, {
      meetingType: meeting.meeting_type,
      audience: meeting.audience,
      courseId: meeting.course_id,
      inviteeIds: meeting.meeting_type === "custom" ? await customInviteeIds(meeting.id) : [],
    });
    const when = new Date(next.startTime).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short", timeZone: next.timezone });
    await notifyUsers(audience.userIds, { title: "Calendar event updated", message: `${next.title} — now ${when}` });
  }
  return NextResponse.json({ ok: true });
}

/** Cancel a platform calendar event and notify its audience. */
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { id } = await ctx.params;
  const result = await loadMeetingForManager(id, user);
  if (result instanceof NextResponse) return result;
  const meeting = result;

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("meetings").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", meeting.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (meeting.meeting_type !== "reminder") {
    const audience = await resolveAudience(user, {
      meetingType: meeting.meeting_type,
      audience: meeting.audience,
      courseId: meeting.course_id,
      inviteeIds: meeting.meeting_type === "custom" ? await customInviteeIds(meeting.id) : [],
    });
    await notifyUsers(audience.userIds, { title: "Calendar event cancelled", message: `${meeting.title} has been cancelled.` });
  }
  return NextResponse.json({ ok: true });
}

async function customInviteeIds(meetingId: string): Promise<string[]> {
  const { data } = await getSupabaseAdminClient().from("meeting_invitees").select("user_id").eq("meeting_id", meetingId);
  return ((data ?? []) as Array<{ user_id: string }>).map((row) => String(row.user_id));
}
