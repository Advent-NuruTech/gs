import {
  collection,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
} from "firebase/firestore";

import { deleteCloudinaryImageByUrl } from "@/lib/cloudinary/deleteImage";
import { db } from "@/lib/firebase/config";
import { calculateDiscount } from "@/lib/utils/calculateDiscount";
import { extractYoutubeId } from "@/lib/utils/extractYoutubeId";
import { normalizeInlineVideoLinks } from "@/lib/utils/normalizeInlineVideoLinks";
import { Course, CourseFilters, CreateCourseInput } from "@/types/course";
import { coursesCollection, courseDoc, lessonCollection } from "@/lib/firebase/firestore";

function mapCourse(snapshot: QueryDocumentSnapshot | DocumentSnapshot): Course {
  const data = (snapshot.data() ?? {}) as Record<string, unknown>;
  const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
  const updatedAt = data.updatedAt as { toDate?: () => Date } | undefined;

  return {
    id: snapshot.id,
    title: String(data.title ?? ""),
    originalPrice: Number(data.originalPrice ?? 0),
    discountedPrice: Number(data.discountedPrice ?? 0),
    finalPrice: Number(data.finalPrice ?? 0),
    thumbnailUrl: String(data.thumbnailUrl ?? ""),
    outline: String(data.outline ?? ""),
    instructorId: String(data.instructorId ?? ""),
    published: Boolean(data.published),
    lessonsCount: Number(data.lessonsCount ?? 0),
    createdAt: createdAt?.toDate?.()?.toISOString(),
    updatedAt: updatedAt?.toDate?.()?.toISOString(),
  };
}

export async function createCourse(input: CreateCourseInput): Promise<string> {
  const courseRef = await addDoc(coursesCollection(), {
    title: input.title,
    originalPrice: input.originalPrice,
    discountedPrice: input.discountedPrice,
    finalPrice: calculateDiscount(input.originalPrice, input.discountedPrice),
    thumbnailUrl: input.thumbnailUrl,
    outline: input.outline,
    instructorId: input.instructorId,
    published: input.published ?? false,
    lessonsCount: input.lessons?.length ?? 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (input.lessons?.length) {
    const sortedLessons = [...input.lessons].map((lesson, index) => ({
      ...lesson,
      order: index + 1,
    }));

    await Promise.all(
      sortedLessons.map((lesson) =>
        addDoc(lessonCollection(courseRef.id), {
          title: lesson.title,
          contentHTML: normalizeInlineVideoLinks(lesson.contentHTML),
          imageUrl: lesson.imageUrl ?? "",
          videoUrl: lesson.videoUrl ?? "",
          videoId: extractYoutubeId(lesson.videoUrl),
          order: lesson.order,
          quiz: lesson.quiz ?? [],
          questions: lesson.quiz ?? [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      ),
    );
  }

  return courseRef.id;
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  const snapshot = await getDoc(courseDoc(courseId));
  if (!snapshot.exists()) return null;
  return mapCourse(snapshot);
}

interface PaginatedCoursesResult {
  courses: Course[];
  lastDoc: QueryDocumentSnapshot | null;
}

export async function listCourses(
  filters: CourseFilters = {},
  cursor?: QueryDocumentSnapshot,
): Promise<PaginatedCoursesResult> {
  const constraints = [orderBy("createdAt", "desc"), limit(filters.pageSize ?? 12)];
  if (typeof filters.published === "boolean") {
    constraints.unshift(where("published", "==", filters.published));
  }
  if (filters.instructorId) {
    constraints.unshift(where("instructorId", "==", filters.instructorId));
  }
  if (cursor) {
    constraints.push(startAfter(cursor));
  }

  const snapshot = await getDocs(query(coursesCollection(), ...constraints));
  return {
    courses: snapshot.docs.map(mapCourse),
    lastDoc: snapshot.docs.at(-1) ?? null,
  };
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

  const payload: Record<string, unknown> = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

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
    payload.finalPrice = calculateDiscount(
      originalPrice,
      discountedPrice,
    );
  }

  await updateDoc(courseDoc(courseId), payload);
}

export async function replaceCourseLessonsCount(
  courseId: string,
  lessonsCount: number,
): Promise<void> {
  await setDoc(
    courseDoc(courseId),
    { lessonsCount, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function deleteCourse(courseId: string): Promise<void> {
  const course = await getCourseById(courseId);
  if (course?.thumbnailUrl) {
    await deleteCloudinaryImageByUrl(course.thumbnailUrl);
  }

  const lessonsSnapshot = await getDocs(lessonCollection(courseId));
  await Promise.all(
    lessonsSnapshot.docs.map(async (lessonDoc) => {
      const lessonData = lessonDoc.data() as Record<string, unknown>;
      const imageUrl = String(lessonData.imageUrl ?? "");
      if (imageUrl) {
        await deleteCloudinaryImageByUrl(imageUrl);
      }
      await deleteDoc(lessonDoc.ref);
    }),
  );

  const [enrollmentSnapshot, paymentSnapshot, quizAttemptSnapshot] = await Promise.all([
    getDocs(query(collection(db, "enrollments"), where("courseId", "==", courseId))),
    getDocs(query(collection(db, "payments"), where("courseId", "==", courseId))),
    getDocs(query(collection(db, "quizAttempts"), where("courseId", "==", courseId))),
  ]);

  await Promise.all([
    ...enrollmentSnapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref)),
    ...paymentSnapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref)),
    ...quizAttemptSnapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref)),
  ]);

  await deleteDoc(courseDoc(courseId));
}
