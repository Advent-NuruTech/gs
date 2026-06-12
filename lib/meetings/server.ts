import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { RequestUser } from "@/lib/api/requireUser";

export type MeetingType = "live_class" | "general" | "custom" | "reminder";
export type MeetingAudience = "course" | "all" | "teachers" | "students" | "custom" | "personal";

export interface MeetingWriteInput {
  title: string;
  description: string;
  meetingType: MeetingType;
  audience: MeetingAudience;
  courseId: string | null;
  startTime: string;
  endTime: string;
  timezone: string;
  recurrenceRule: string | null;
  inviteeIds: string[];
}

export interface ResolvedAudience {
  /** Users (besides the host) who should be invited / notified. */
  userIds: string[];
  emails: string[];
}

/** Can this user create this kind of meeting? Returns an error string or null. */
export async function checkCreatePermission(
  user: RequestUser,
  input: MeetingWriteInput,
): Promise<string | null> {
  if (user.role === "student") {
    return input.meetingType === "reminder"
      ? null
      : "Students can only create personal learning reminders.";
  }
  if (user.role === "teacher") {
    if (input.meetingType === "reminder") return null;
    if (input.meetingType !== "live_class") {
      return "Teachers can schedule live classes for their own courses.";
    }
    if (!input.courseId) return "Pick the course this live class belongs to.";
    const supabase = getSupabaseAdminClient();
    const { data: course } = await supabase
      .from("courses")
      .select("instructor_id")
      .eq("id", input.courseId)
      .maybeSingle();
    if (!course) return "Course not found.";
    if (String(course.instructor_id) !== user.id) {
      return "You can only schedule live classes for courses you teach.";
    }
    return null;
  }
  // Admin: full access, but live classes still need a course.
  if (input.meetingType === "live_class" && !input.courseId) {
    return "Pick the course this live class belongs to.";
  }
  if (input.meetingType === "custom" && input.inviteeIds.length === 0) {
    return "Pick at least one participant.";
  }
  return null;
}

/** Resolve who is in the audience (for Calendar invites + in-app notices). */
export async function resolveAudience(
  host: RequestUser,
  input: Pick<MeetingWriteInput, "meetingType" | "audience" | "courseId" | "inviteeIds">,
): Promise<ResolvedAudience> {
  const supabase = getSupabaseAdminClient();

  if (input.meetingType === "reminder") {
    return { userIds: [], emails: [] };
  }

  if (input.meetingType === "live_class" && input.courseId) {
    const { data } = await supabase
      .from("enrollments")
      .select("user_id, profiles!enrollments_user_id_fkey(email)")
      .eq("course_id", input.courseId);
    const rows = (data ?? []) as unknown as Array<{
      user_id: string;
      profiles: { email: string } | null;
    }>;
    return {
      userIds: rows.map((row) => String(row.user_id)),
      emails: rows.map((row) => String(row.profiles?.email ?? "")).filter(Boolean),
    };
  }

  if (input.meetingType === "custom") {
    if (input.inviteeIds.length === 0) return { userIds: [], emails: [] };
    const { data } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", input.inviteeIds);
    const rows = (data ?? []) as Array<{ id: string; email: string }>;
    return {
      userIds: rows.map((row) => String(row.id)),
      emails: rows.map((row) => String(row.email)).filter(Boolean),
    };
  }

  // general: all / teachers / students
  let query = supabase.from("profiles").select("id, email").neq("id", host.id);
  if (input.audience === "teachers") query = query.eq("role", "teacher");
  else if (input.audience === "students") query = query.eq("role", "student");
  const { data } = await query.limit(1000);
  const rows = (data ?? []) as Array<{ id: string; email: string }>;
  return {
    userIds: rows.map((row) => String(row.id)),
    emails: rows.map((row) => String(row.email)).filter(Boolean),
  };
}

/** Fan out in-app notifications (best-effort, batched, role-aware links). */
export async function notifyUsers(
  userIds: string[],
  notice: { title: string; message: string },
): Promise<void> {
  if (userIds.length === 0) return;
  const supabase = getSupabaseAdminClient();
  const ids = [...new Set(userIds)].slice(0, 1000);
  const { data: profiles } = await supabase.from("profiles").select("id, role").in("id", ids);
  const roleById = new Map(
    ((profiles ?? []) as Array<{ id: string; role: string }>).map((row) => [row.id, row.role]),
  );
  const rows = ids.map((userId) => ({
    user_id: userId,
    title: notice.title,
    message: notice.message,
    link: liveClassesPath(roleById.get(userId) ?? "student"),
  }));
  await supabase.from("notifications").insert(rows);
}

/** Role-aware path to the Live Classes page, for notification links. */
export function liveClassesPath(role: string): string {
  if (role === "teacher") return "/dashboard/teacher/live-classes";
  if (role === "admin") return "/dashboard/admin/live-classes";
  return "/dashboard/student/live-classes";
}

export function parseMeetingInput(body: Record<string, unknown>): MeetingWriteInput | string {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return "A meeting title is required.";

  const startTime = typeof body.startTime === "string" ? body.startTime : "";
  const endTime = typeof body.endTime === "string" ? body.endTime : "";
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Valid start and end times are required.";
  }
  if (end.getTime() <= start.getTime()) return "End time must be after the start time.";

  const meetingType = (body.meetingType as MeetingType) ?? "live_class";
  if (!["live_class", "general", "custom", "reminder"].includes(meetingType)) {
    return "Unknown meeting type.";
  }
  const audience = (body.audience as MeetingAudience) ?? defaultAudience(meetingType);
  if (!["course", "all", "teachers", "students", "custom", "personal"].includes(audience)) {
    return "Unknown audience.";
  }

  const recurrenceRule =
    typeof body.recurrenceRule === "string" && body.recurrenceRule.startsWith("RRULE:")
      ? body.recurrenceRule
      : null;

  return {
    title,
    description: typeof body.description === "string" ? body.description : "",
    meetingType,
    audience,
    courseId: typeof body.courseId === "string" && body.courseId ? body.courseId : null,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    timezone: typeof body.timezone === "string" && body.timezone ? body.timezone : "Africa/Nairobi",
    recurrenceRule,
    inviteeIds: Array.isArray(body.inviteeIds) ? body.inviteeIds.map(String).filter(Boolean) : [],
  };
}

function defaultAudience(meetingType: MeetingType): MeetingAudience {
  if (meetingType === "live_class") return "course";
  if (meetingType === "custom") return "custom";
  if (meetingType === "reminder") return "personal";
  return "all";
}
