import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Enrollment } from "@/types/enrollment";

const supabase = getSupabaseBrowserClient();

export function mapEnrollment(data: Record<string, unknown>): Enrollment {
  return {
    id: String(data.id ?? ""),
    userId: String(data.user_id ?? ""),
    courseId: String(data.course_id ?? ""),
    completedLessons: (data.completed_lessons as string[]) ?? [],
    unlockedLessons: (data.unlocked_lessons as string[]) ?? [],
    progress: Number(data.progress ?? 0),
    status: (data.status as Enrollment["status"]) ?? "in_progress",
    lastOpenedLessonId: data.last_opened_lesson_id ? String(data.last_opened_lesson_id) : undefined,
    totalStudyMinutes: Number(data.total_study_minutes ?? 0),
    enrolledAt: data.enrolled_at ? String(data.enrolled_at) : undefined,
    updatedAt: data.updated_at ? String(data.updated_at) : undefined,
  };
}

/**
 * Ensures an enrollment row exists for a user/course. Lesson access is granted
 * separately via paid `lesson_unlocks` (see payment fulfillment), so this does
 * not unlock any lesson for free.
 */
export async function enrollUserInCourse(
  userId: string,
  courseId: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (existing) return String(existing.id);

  const { data, error } = await supabase
    .from("enrollments")
    .insert({ user_id: userId, course_id: courseId })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not enroll.");
  return String(data.id);
}

export async function getEnrollmentByUserAndCourse(
  userId: string,
  courseId: string,
): Promise<Enrollment | null> {
  const { data, error } = await supabase
    .from("enrollments")
    .select("*")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapEnrollment(data) : null;
}

export async function updateEnrollmentProgress(
  enrollmentId: string,
  courseId: string,
): Promise<void> {
  const [{ data: enrollment }, { count }] = await Promise.all([
    supabase.from("enrollments").select("completed_lessons").eq("id", enrollmentId).maybeSingle(),
    supabase.from("lesson_previews").select("id", { count: "exact", head: true }).eq("course_id", courseId),
  ]);

  if (!enrollment) throw new Error("Enrollment does not exist.");
  const completedLessons = (enrollment.completed_lessons as string[]) ?? [];
  const totalLessons = count ?? 0;
  const progress = totalLessons
    ? Math.min(100, Math.round((completedLessons.length / totalLessons) * 100))
    : 0;
  const status: Enrollment["status"] = progress >= 100 ? "completed" : "in_progress";

  const { error } = await supabase
    .from("enrollments")
    .update({ progress, status })
    .eq("id", enrollmentId);
  if (error) throw new Error(error.message);
}

export async function listUserEnrollments(userId: string): Promise<Enrollment[]> {
  const { data, error } = await supabase.from("enrollments").select("*").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapEnrollment);
}

export async function listAllEnrollments(): Promise<Enrollment[]> {
  const { data, error } = await supabase.from("enrollments").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapEnrollment);
}

export async function updateEnrollmentLastOpenedLesson(
  enrollmentId: string,
  lessonId: string,
): Promise<void> {
  const { error } = await supabase
    .from("enrollments")
    .update({ last_opened_lesson_id: lessonId })
    .eq("id", enrollmentId);
  if (error) throw new Error(error.message);
}

export async function addEnrollmentStudyMinutes(
  enrollmentId: string,
  minutes: number,
): Promise<void> {
  const { data } = await supabase
    .from("enrollments")
    .select("total_study_minutes")
    .eq("id", enrollmentId)
    .maybeSingle();
  if (!data) return;
  const currentTotal = Number(data.total_study_minutes ?? 0);
  await supabase
    .from("enrollments")
    .update({ total_study_minutes: currentTotal + minutes })
    .eq("id", enrollmentId);
}
