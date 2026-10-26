import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  CreateMeetingInput,
  Meeting,
  MeetingAttendanceRecord,
  UpdateMeetingInput,
} from "@/types/meeting";

const supabase = getSupabaseBrowserClient();

function mapMeeting(row: Record<string, unknown>): Meeting {
  const course = row.courses as { title?: string } | null;
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    meetingType: (row.meeting_type as Meeting["meetingType"]) ?? "live_class",
    audience: (row.audience as Meeting["audience"]) ?? "course",
    courseId: row.course_id ? String(row.course_id) : undefined,
    courseTitle: course?.title ? String(course.title) : undefined,
    createdBy: String(row.created_by ?? ""),
    hostId: String(row.host_id ?? ""),
    startTime: String(row.start_time ?? ""),
    endTime: String(row.end_time ?? ""),
    timezone: String(row.timezone ?? "Africa/Nairobi"),
    recurrenceRule: row.recurrence_rule ? String(row.recurrence_rule) : undefined,
    meetingUrl: row.meeting_url ? String(row.meeting_url) : undefined,
    location: row.location ? String(row.location) : undefined,
    status: (row.status as Meeting["status"]) ?? "scheduled",
    createdAt: row.created_at ? String(row.created_at) : undefined,
  };
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseError(response: Response, fallback: string): Promise<string> {
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  return payload.error ?? fallback;
}

// Reads (RLS decides what each role can see) ---------------------------------

/** Meetings visible to the signed-in user, from `since` onwards. */
export async function listMyMeetings(options?: {
  includePast?: boolean;
  courseId?: string;
}): Promise<Meeting[]> {
  let query = supabase
    .from("meetings")
    .select("*, courses(title)")
    .neq("status", "cancelled")
    .order("start_time", { ascending: true });
  if (!options?.includePast) {
    // Recurring events may have started in the past but still have future occurrences.
    const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    query = query.or(`start_time.gte.${since},recurrence_rule.not.is.null`);
  }
  if (options?.courseId) query = query.eq("course_id", options.courseId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => mapMeeting(row));
}

/** Everything (including past/cancelled) for management views. */
export async function listAllVisibleMeetings(): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from("meetings")
    .select("*, courses(title)")
    .order("start_time", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => mapMeeting(row));
}

export async function listMeetingAttendance(
  meetingId: string,
): Promise<MeetingAttendanceRecord[]> {
  const { data, error } = await supabase
    .from("meeting_attendance")
    .select("*, profiles(full_name)")
    .eq("meeting_id", meetingId)
    .order("first_joined_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => {
    const profile = row.profiles as { full_name?: string } | null;
    return {
      id: String(row.id ?? ""),
      meetingId: String(row.meeting_id ?? ""),
      userId: String(row.user_id ?? ""),
      userName: profile?.full_name ? String(profile.full_name) : undefined,
      firstJoinedAt: String(row.first_joined_at ?? ""),
      lastJoinedAt: String(row.last_joined_at ?? ""),
      joinCount: Number(row.join_count ?? 1),
      durationMinutes: row.duration_minutes ? Number(row.duration_minutes) : undefined,
      source: String(row.source ?? "app"),
    };
  });
}

// Writes (server API persists events in the AdventSkool calendar) ------------

export async function createMeeting(input: CreateMeetingInput): Promise<{
  id: string;
  meetingUrl: string | null;
}> {
  const response = await fetch("/api/meetings", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await parseError(response, "Could not create the meeting."));
  const payload = (await response.json()) as { id: string; meetingUrl: string | null };
  return payload;
}

export async function updateMeeting(meetingId: string, input: UpdateMeetingInput): Promise<void> {
  const response = await fetch(`/api/meetings/${meetingId}`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await parseError(response, "Could not update the meeting."));
}

export async function cancelMeeting(meetingId: string): Promise<void> {
  const response = await fetch(`/api/meetings/${meetingId}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response, "Could not cancel the meeting."));
}

/** Records attendance and returns the host-provided session URL. */
export async function joinMeeting(meetingId: string): Promise<string> {
  const response = await fetch(`/api/meetings/${meetingId}/join`, {
    method: "POST",
    headers: await authHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response, "Could not join the meeting."));
  const payload = (await response.json()) as { meetingUrl: string };
  return payload.meetingUrl;
}
