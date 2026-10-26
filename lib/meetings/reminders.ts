import "server-only";

import { meetingOccurrencesInRange } from "@/lib/meetings/occurrences";
import { liveClassesPath } from "@/lib/meetings/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { Meeting } from "@/types/meeting";

type ReminderMeeting = {
  id: string; title: string; description: string; meeting_type: Meeting["meetingType"]; audience: Meeting["audience"];
  course_id: string | null; created_by: string; host_id: string; start_time: string; end_time: string; timezone: string;
  recurrence_rule: string | null; meeting_url: string | null; location: string; status: Meeting["status"]; created_at: string;
};

function asMeeting(row: ReminderMeeting): Meeting {
  return {
    id: row.id, title: row.title, description: row.description, meetingType: row.meeting_type, audience: row.audience,
    courseId: row.course_id ?? undefined, createdBy: row.created_by, hostId: row.host_id, startTime: row.start_time,
    endTime: row.end_time, timezone: row.timezone, recurrenceRule: row.recurrence_rule ?? undefined,
    meetingUrl: row.meeting_url ?? undefined, location: row.location || undefined, status: row.status, createdAt: row.created_at,
  };
}

async function recipientIds(meeting: ReminderMeeting): Promise<string[]> {
  const supabase = getSupabaseAdminClient();
  if (meeting.meeting_type === "reminder") return [meeting.host_id];
  if (meeting.meeting_type === "live_class" && meeting.course_id) {
    const { data } = await supabase.from("enrollments").select("user_id").eq("course_id", meeting.course_id);
    return ((data ?? []) as Array<{ user_id: string }>).map((row) => row.user_id);
  }
  if (meeting.meeting_type === "custom") {
    const { data } = await supabase.from("meeting_invitees").select("user_id").eq("meeting_id", meeting.id);
    return ((data ?? []) as Array<{ user_id: string }>).map((row) => row.user_id);
  }
  let query = supabase.from("profiles").select("id").neq("id", meeting.host_id);
  if (meeting.audience === "teachers") query = query.eq("role", "teacher");
  if (meeting.audience === "students") query = query.eq("role", "student");
  const { data } = await query.limit(1000);
  return ((data ?? []) as Array<{ id: string }>).map((row) => row.id);
}

/** Delivers idempotent 24-hour and 1-hour in-app event reminders. */
export async function sendCalendarReminders(): Promise<{ delivered: number }> {
  const supabase = getSupabaseAdminClient();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000 + 10 * 60 * 1000);
  const { data } = await supabase.from("meetings").select("*").eq("status", "scheduled").or(`start_time.lte.${windowEnd.toISOString()},recurrence_rule.not.is.null`).limit(2000);
  const meetings = (data ?? []) as unknown as ReminderMeeting[];
  let delivered = 0;
  for (const rawMeeting of meetings) {
    const occurrences = meetingOccurrencesInRange([asMeeting(rawMeeting)], now, windowEnd);
    if (!occurrences.length) continue;
    const users = await recipientIds(rawMeeting);
    if (!users.length) continue;
    const { data: profiles } = await supabase.from("profiles").select("id, role").in("id", users);
    const roles = new Map(((profiles ?? []) as Array<{ id: string; role: string }>).map((profile) => [profile.id, profile.role]));
    for (const occurrence of occurrences) {
      const occurrenceStart = new Date(occurrence.startTime);
      for (const offset of [1440, 60]) {
        const reminderTime = occurrenceStart.getTime() - offset * 60 * 1000;
        if (reminderTime > now.getTime() || reminderTime < now.getTime() - 10 * 60 * 1000) continue;
        for (const userId of users) {
          const { data: delivery } = await supabase.from("meeting_reminder_deliveries").upsert({
            meeting_id: rawMeeting.id, user_id: userId, reminder_offset_minutes: offset, occurrence_start: occurrence.startTime,
          }, { onConflict: "meeting_id,user_id,reminder_offset_minutes,occurrence_start", ignoreDuplicates: true }).select("id").maybeSingle();
          if (!delivery) continue;
          await supabase.from("notifications").insert({
            user_id: userId,
            title: offset === 60 ? "Starting in 1 hour" : "Tomorrow's calendar event",
            message: `${rawMeeting.title} — ${occurrenceStart.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short", timeZone: rawMeeting.timezone })}`,
            link: liveClassesPath(roles.get(userId) ?? "student"),
          });
          delivered += 1;
        }
      }
    }
  }
  return { delivered };
}
