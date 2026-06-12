import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  CreateMeetingInput,
  GoogleConnectionStatus,
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
    googleEventId: row.google_event_id ? String(row.google_event_id) : undefined,
    googleMeetUrl: row.google_meet_url ? String(row.google_meet_url) : undefined,
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
    // Keep meetings visible for 2h after their start so "live now" still shows.
    query = query.gte("start_time", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());
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

// Writes (server API keeps Google Calendar in sync) ---------------------------

export async function createMeeting(input: CreateMeetingInput): Promise<{
  id: string;
  meetUrl: string | null;
}> {
  const response = await fetch("/api/meetings", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await parseError(response, "Could not create the meeting."));
  const payload = (await response.json()) as { id: string; meetUrl: string | null };
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

/** Records attendance and returns the Meet URL to open. */
export async function joinMeeting(meetingId: string): Promise<string> {
  const response = await fetch(`/api/meetings/${meetingId}/join`, {
    method: "POST",
    headers: await authHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response, "Could not join the meeting."));
  const payload = (await response.json()) as { meetUrl: string };
  return payload.meetUrl;
}

export async function syncMeetingAttendance(meetingId: string): Promise<{
  participantsFound: number;
  recordsUpdated: number;
  note?: string;
}> {
  const response = await fetch(`/api/meetings/${meetingId}/attendance`, {
    method: "POST",
    headers: await authHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response, "Attendance sync failed."));
  return (await response.json()) as {
    participantsFound: number;
    recordsUpdated: number;
    note?: string;
  };
}

// Google connection -----------------------------------------------------------

export async function getGoogleStatus(): Promise<GoogleConnectionStatus> {
  const response = await fetch("/api/google/status", { headers: await authHeaders() });
  if (!response.ok) return { connected: false, email: null, connectedAt: null };
  return (await response.json()) as GoogleConnectionStatus;
}

export async function disconnectGoogle(): Promise<void> {
  const response = await fetch("/api/google/status", {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response, "Could not disconnect Google."));
}

/** Browser navigation that starts the Google consent flow. */
export function startGoogleConnect(redirectPath: string): void {
  window.location.href = `/api/google/oauth/start?redirect=${encodeURIComponent(redirectPath)}`;
}
