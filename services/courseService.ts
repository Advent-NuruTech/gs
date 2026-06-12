import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { deleteCloudinaryImageByUrl } from "@/lib/cloudinary/deleteImage";
import { calculateDiscount } from "@/lib/utils/calculateDiscount";
import { extractYoutubeId } from "@/lib/utils/extractYoutubeId";
import { normalizeInlineVideoLinks } from "@/lib/utils/normalizeInlineVideoLinks";
import { Course, CourseFilters, CreateCourseInput } from "@/types/course";

const supabase = getSupabaseBrowserClient();

function normalizeCourseCategory(category?: string): string {
  const normalized = (category ?? "").trim().replace(/\s+/g, " ");
  return normalized || "General";
}

function mapCourse(data: Record<string, unknown>): Course {
  return {
    id: String(data.id ?? ""),
    title: String(data.title ?? ""),
    category: normalizeCourseCategory(String(data.category ?? "")),
    originalPrice: Number(data.original_price ?? 0),
    discountedPrice: Number(data.discounted_price ?? 0),
    finalPrice: Number(data.final_price ?? 0),
    thumbnailUrl: String(data.thumbnail_url ?? ""),
    outline: String(data.outline ?? ""),
    instructorId: String(data.instructor_id ?? ""),
    published: Boolean(data.published),
    lessonsCount: Number(data.lessons_count ?? 0),
    createdAt: data.created_at ? String(data.created_at) : undefined,
    updatedAt: data.updated_at ? String(data.updated_at) : undefined,
  };
}

export async function createCourse(input: CreateCourseInput): Promise<string> {
  const { data, error } = await supabase
    .from("courses")
    .insert({
      title: input.title,
      category: normalizeCourseCategory(input.category),
      original_price: input.originalPrice,
      discounted_price: input.discountedPrice,
      final_price: calculateDiscount(input.originalPrice, input.discountedPrice),
      thumbnail_url: input.thumbnailUrl,
      outline: input.outline,
      instructor_id: input.instructorId,
      published: input.published ?? false,
      lessons_count: input.lessons?.length ?? 0,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not create course.");
  const courseId = String(data.id);

  if (input.lessons?.length) {
    const rows = input.lessons.map((lesson, index) => ({
      course_id: courseId,
      title: lesson.title,
      content_html: normalizeInlineVideoLinks(lesson.contentHTML),
      image_url: lesson.imageUrl ?? "",
      video_url: lesson.videoUrl ?? "",
      video_id: extractYoutubeId(lesson.videoUrl),
      order_index: index + 1,
      quiz: lesson.quiz ?? [],
    }));
    const { error: lessonError } = await supabase.from("lessons").insert(rows);
    if (lessonError) throw new Error(lessonError.message);
  }

  return courseId;
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapCourse(data) : null;
}

interface PaginatedCoursesResult {
  courses: Course[];
  lastDoc: number | null;
}

export async function listCourses(
  filters: CourseFilters = {},
  cursor?: number,
): Promise<PaginatedCoursesResult> {
  const pageSize = filters.pageSize ?? 12;
  const from = cursor ?? 0;

  let queryBuilder = supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (typeof filters.published === "boolean") {
    queryBuilder = queryBuilder.eq("published", filters.published);
  }
  if (filters.category) {
    queryBuilder = queryBuilder.eq("category", normalizeCourseCategory(filters.category));
  }
  if (filters.instructorId) {
    queryBuilder = queryBuilder.eq("instructor_id", filters.instructorId);
  }

  const { data, error } = await queryBuilder;
  if (error) throw new Error(error.message);

  const courses = (data ?? []).map(mapCourse);
  const lastDoc = courses.length === pageSize ? from + pageSize : null;
  return { courses, lastDoc };
}

export async function updateCourse(
  courseId: string,
  updates: Partial<CreateCourseInput>,
): Promise<void> {
  const requiresCurrentCourse =
    typeof updates.originalPrice === "number" ||
    typeof updates.discountedPrice === "number" ||
    typeof updates.thumbnailUrl === "string";
  const currentCourse = requiresCurrentCourse ? await getCourseById(courseId) : null;

  if (requiresCurrentCourse && !currentCourse) {
    throw new Error("Course does not exist.");
  }

  if (
    typeof updates.thumbnailUrl === "string" &&
    currentCourse?.thumbnailUrl &&
    currentCourse.thumbnailUrl !== updates.thumbnailUrl
  ) {
    await deleteCloudinaryImageByUrl(currentCourse.thumbnailUrl);
  }

  const payload: Record<string, unknown> = {};
  if (typeof updates.title === "string") payload.title = updates.title;
  if (typeof updates.outline === "string") payload.outline = updates.outline;
  if (typeof updates.thumbnailUrl === "string") payload.thumbnail_url = updates.thumbnailUrl;
  if (typeof updates.published === "boolean") payload.published = updates.published;
  if (typeof updates.originalPrice === "number") payload.original_price = updates.originalPrice;
  if (typeof updates.discountedPrice === "number") payload.discounted_price = updates.discountedPrice;
  if (typeof updates.category === "string") payload.category = normalizeCourseCategory(updates.category);

  if (
    typeof updates.originalPrice === "number" ||
    typeof updates.discountedPrice === "number"
  ) {
    const originalPrice =
      typeof updates.originalPrice === "number"
        ? updates.originalPrice
        : currentCourse?.originalPrice ?? 0;
    const discountedPrice =
      typeof updates.discountedPrice === "number"
        ? updates.discountedPrice
        : currentCourse?.discountedPrice ?? 0;
    payload.final_price = calculateDiscount(originalPrice, discountedPrice);
  }

  const { error } = await supabase.from("courses").update(payload).eq("id", courseId);
  if (error) throw new Error(error.message);
}

export async function replaceCourseLessonsCount(
  courseId: string,
  lessonsCount: number,
): Promise<void> {
  const { error } = await supabase
    .from("courses")
    .update({ lessons_count: lessonsCount })
    .eq("id", courseId);
  if (error) throw new Error(error.message);
}

export async function deleteCourse(courseId: string): Promise<void> {
  const course = await getCourseById(courseId);
  if (course?.thumbnailUrl) {
    await deleteCloudinaryImageByUrl(course.thumbnailUrl);
  }

  // Clean up lesson images before the cascade delete removes the rows.
  const { data: lessons } = await supabase
    .from("lessons")
    .select("image_url")
    .eq("course_id", courseId);
  await Promise.all(
    (lessons ?? [])
      .map((row: Record<string, unknown>) => String(row.image_url ?? ""))
      .filter(Boolean)
      .map((url: string) => deleteCloudinaryImageByUrl(url)),
  );

  // ON DELETE CASCADE removes lessons, enrollments, payments, quiz attempts.
  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  if (error) throw new Error(error.message);
}
