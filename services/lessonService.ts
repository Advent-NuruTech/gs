import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { deleteCloudinaryImageByUrl } from "@/lib/cloudinary/deleteImage";
import { extractYoutubeId } from "@/lib/utils/extractYoutubeId";
import { normalizeInlineVideoLinks } from "@/lib/utils/normalizeInlineVideoLinks";
import { Enrollment } from "@/types/enrollment";
import { CreateLessonInput, Lesson, UpdateLessonInput } from "@/types/lesson";
import { updateEnrollmentProgress } from "@/services/enrollmentService";

const supabase = getSupabaseBrowserClient();

function mapLesson(data: Record<string, unknown>): Lesson {
  const quizQuestions = (data.quiz as Lesson["quiz"]) ?? [];
  return {
    id: String(data.id ?? ""),
    title: String(data.title ?? ""),
    contentHTML: String(data.content_html ?? ""),
    imageUrl: String(data.image_url ?? ""),
    videoUrl: String(data.video_url ?? ""),
    videoId: String(data.video_id ?? ""),
    order: Number(data.order_index ?? 0),
    quiz: quizQuestions,
    questions: quizQuestions,
    createdAt: data.created_at ? String(data.created_at) : undefined,
    updatedAt: data.updated_at ? String(data.updated_at) : undefined,
  };
}

function mapLessonPreview(data: Record<string, unknown>): Lesson {
  return {
    id: String(data.id ?? ""),
    title: String(data.title ?? ""),
    contentHTML: "",
    imageUrl: "",
    videoUrl: "",
    videoId: "",
    order: Number(data.order_index ?? 0),
    quiz: [],
    questions: [],
  };
}

export async function createLesson(input: CreateLessonInput): Promise<string> {
  const normalizedQuestions = input.quiz ?? input.questions ?? [];
  const { data, error } = await supabase
    .from("lessons")
    .insert({
      course_id: input.courseId,
      title: input.title,
      content_html: normalizeInlineVideoLinks(input.contentHTML),
      image_url: input.imageUrl ?? "",
      video_url: input.videoUrl ?? "",
      video_id: extractYoutubeId(input.videoUrl),
      order_index: input.order,
      quiz: normalizedQuestions,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create lesson.");
  return String(data.id);
}

/**
 * Lightweight, content-free list of a course's lessons (titles + order) read
 * from the public `lesson_previews` view. Safe for curriculum sidebars and
 * course outlines regardless of whether the viewer has unlocked the lessons.
 */
export async function listCourseLessons(courseId: string): Promise<Lesson[]> {
  const { data, error } = await supabase
    .from("lesson_previews")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapLessonPreview);
}

/**
 * Full lesson content. RLS only returns the row if the caller owns the course
 * (instructor/admin) or has unlocked this lesson.
 */
export async function getLessonById(
  courseId: string,
  lessonId: string,
): Promise<Lesson | null> {
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapLesson(data) : null;
}

export async function updateLesson(
  courseId: string,
  lessonId: string,
  updates: UpdateLessonInput,
): Promise<void> {
  const existing = await getLessonById(courseId, lessonId);
  if (!existing) throw new Error("Lesson does not exist.");

  if (
    typeof updates.imageUrl === "string" &&
    updates.imageUrl !== existing.imageUrl &&
    existing.imageUrl
  ) {
    await deleteCloudinaryImageByUrl(existing.imageUrl);
  }

  const payload: Record<string, unknown> = {};
  if (typeof updates.title === "string") payload.title = updates.title;
  if (typeof updates.order === "number") payload.order_index = updates.order;
  if (typeof updates.imageUrl === "string") payload.image_url = updates.imageUrl;
  if (typeof updates.contentHTML === "string") {
    payload.content_html = normalizeInlineVideoLinks(updates.contentHTML);
  }
  if (typeof updates.videoUrl === "string") {
    payload.video_url = updates.videoUrl;
    payload.video_id = extractYoutubeId(updates.videoUrl);
  }
  if (updates.quiz || updates.questions) {
    payload.quiz = updates.quiz ?? updates.questions ?? [];
  }

  const { error } = await supabase.from("lessons").update(payload).eq("id", lessonId);
  if (error) throw new Error(error.message);
}

export async function deleteLesson(courseId: string, lessonId: string): Promise<void> {
  const existing = await getLessonById(courseId, lessonId);
  if (existing?.imageUrl) {
    await deleteCloudinaryImageByUrl(existing.imageUrl);
  }
  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
  if (error) throw new Error(error.message);
}

/**
 * Marks a lesson complete. With pay-to-unlock, completion no longer unlocks the
 * next lesson (access is purchase-driven); it only records progress.
 */
export async function completeLessonForEnrollment(
  enrollment: Enrollment,
  courseId: string,
  lessonId: string,
): Promise<void> {
  if (enrollment.completedLessons.includes(lessonId)) return;

  const completed = [...new Set([...enrollment.completedLessons, lessonId])];
  const { error } = await supabase
    .from("enrollments")
    .update({ completed_lessons: completed })
    .eq("id", enrollment.id);
  if (error) throw new Error(error.message);

  await updateEnrollmentProgress(enrollment.id, courseId);
}

export function canUnlockLesson(
  enrollment: Enrollment,
  lessonId: string,
): boolean {
  return enrollment.unlockedLessons.includes(lessonId);
}
