import { NextRequest, NextResponse } from "next/server";

import { getRequestUser } from "@/lib/api/requireUser";
import {
  checkCreatePermission,
  notifyUsers,
  parseMeetingInput,
  resolveAudience,
} from "@/lib/meetings/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** Create a platform-owned calendar event and notify its visible audience. */
export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const input = parseMeetingInput(body);
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });

  const permissionError = await checkCreatePermission(user, input);
  if (permissionError) return NextResponse.json({ error: permissionError }, { status: 403 });

  const audience = await resolveAudience(user, input);
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
      meeting_url: input.meetingUrl,
      location: input.location,
      recurrence_rule: input.recurrenceRule,
    })
    .select("id")
    .single();
  if (error || !meeting) {
    return NextResponse.json({ error: error?.message ?? "Could not save the calendar event." }, { status: 400 });
  }
  const meetingId = String(meeting.id);

  if (input.meetingType === "custom" && audience.userIds.length > 0) {
    const { data: invitees } = await supabase.from("profiles").select("id, email").in("id", audience.userIds);
    await supabase.from("meeting_invitees").insert(
      ((invitees ?? []) as Array<{ id: string; email: string }>).map((row) => ({
        meeting_id: meetingId,
        user_id: row.id,
        email: row.email,
      })),
    );
  }

  if (input.meetingType !== "reminder") {
    const when = new Date(input.startTime).toLocaleString("en-KE", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: input.timezone,
    });
    await notifyUsers(audience.userIds, {
      title: input.meetingType === "live_class" ? "New live class scheduled" : "New calendar event",
      message: `${input.title} — ${when}`,
    });
  }

  return NextResponse.json({ id: meetingId, meetingUrl: input.meetingUrl });
}
