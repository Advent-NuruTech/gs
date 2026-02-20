import {
  addDoc,
  arrayUnion,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase/config";
import { deleteCloudinaryImageByUrl } from "@/lib/cloudinary/deleteImage";
import { lessonCollection } from "@/lib/firebase/firestore";
import { extractYoutubeId } from "@/lib/utils/extractYoutubeId";
import { normalizeInlineVideoLinks } from "@/lib/utils/normalizeInlineVideoLinks";
import { Enrollment } from "@/types/enrollment";
import { CreateLessonInput, Lesson, UpdateLessonInput } from "@/types/lesson";
import { updateEnrollmentProgress } from "@/services/enrollmentService";

function mapLesson(
  lessonId: string,
  lessonData: Record<string, unknown>,
): Lesson {
  const quizQuestions =
    (lessonData.quiz as Lesson["quiz"]) ??
    (lessonData.questions as Lesson["quiz"]) ??
    [];

  return {
    id: lessonId,
    title: String(lessonData.title ?? ""),
    contentHTML: String(lessonData.contentHTML ?? ""),
    imageUrl: String(lessonData.imageUrl ?? ""),
    videoUrl: String(lessonData.videoUrl ?? ""),
    videoId: String(lessonData.videoId ?? ""),
    order: Number(lessonData.order ?? 0),
    quiz: quizQuestions,
    questions: quizQuestions,
    createdAt: (lessonData.createdAt as { toDate?: () => Date })?.toDate?.().toISOString(),
    updatedAt: (lessonData.updatedAt as { toDate?: () => Date })?.toDate?.().toISOString(),
  };
}

export async function createLesson(input: CreateLessonInput): Promise<string> {
  const normalizedQuestions = input.quiz ?? input.questions ?? [];
  const lessonRef = await addDoc(lessonCollection(input.courseId), {
    title: input.title,
    contentHTML: normalizeInlineVideoLinks(input.contentHTML),
    imageUrl: input.imageUrl ?? "",
    videoUrl: input.videoUrl ?? "",
    videoId: extractYoutubeId(input.videoUrl),
    order: input.order,
    quiz: normalizedQuestions,
    questions: normalizedQuestions,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return lessonRef.id;
}

export async function listCourseLessons(courseId: string): Promise<Lesson[]> {
  const snapshot = await getDocs(
    query(lessonCollection(courseId), orderBy("order", "asc")),
  );
  return snapshot.docs.map((docSnapshot) => mapLesson(docSnapshot.id, docSnapshot.data()));
}

export async function getLessonById(
  courseId: string,
  lessonId: string,
): Promise<Lesson | null> {
  const snapshot = await getDoc(doc(db, "courses", courseId, "lessons", lessonId));
  if (!snapshot.exists()) return null;
  return mapLesson(snapshot.id, (snapshot.data() ?? {}) as Record<string, unknown>);
}

export async function updateLesson(
  courseId: string,
  lessonId: string,
  updates: UpdateLessonInput,
): Promise<void> {
  const lessonRef = doc(db, "courses", courseId, "lessons", lessonId);
  const existingSnapshot = await getDoc(lessonRef);
  if (!existingSnapshot.exists()) {
    throw new Error("Lesson does not exist.");
  }

  const existingData = (existingSnapshot.data() ?? {}) as Record<string, unknown>;
  const existingImageUrl = String(existingData.imageUrl ?? "");

  if (typeof updates.imageUrl === "string" && updates.imageUrl !== existingImageUrl && existingImageUrl) {
    await deleteCloudinaryImageByUrl(existingImageUrl);
  }

  const payload: Record<string, unknown> = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

  if (typeof updates.contentHTML === "string") {
    payload.contentHTML = normalizeInlineVideoLinks(updates.contentHTML);
  }

  if (typeof updates.videoUrl === "string") {
    payload.videoId = extractYoutubeId(updates.videoUrl);
  }

  if (updates.quiz || updates.questions) {
    const normalizedQuestions = updates.quiz ?? updates.questions ?? [];
    payload.quiz = normalizedQuestions;
    payload.questions = normalizedQuestions;
  }

  await updateDoc(lessonRef, {
    ...payload,
  });
}

export async function deleteLesson(courseId: string, lessonId: string): Promise<void> {
  const lessonRef = doc(db, "courses", courseId, "lessons", lessonId);
  const snapshot = await getDoc(lessonRef);
  if (snapshot.exists()) {
    const data = (snapshot.data() ?? {}) as Record<string, unknown>;
    const imageUrl = String(data.imageUrl ?? "");
    if (imageUrl) {
      await deleteCloudinaryImageByUrl(imageUrl);
    }
  }
  await deleteDoc(lessonRef);
}

export async function completeLessonForEnrollment(
  enrollment: Enrollment,
  courseId: string,
  lessonId: string,
): Promise<void> {
  if (enrollment.completedLessons.includes(lessonId)) {
    return;
  }

  const enrollmentRef = doc(db, "enrollments", enrollment.id);
  const currentLessonRef = doc(db, "courses", courseId, "lessons", lessonId);
  const currentLessonSnapshot = await getDoc(currentLessonRef);
  if (!currentLessonSnapshot.exists()) {
    throw new Error("Lesson does not exist.");
  }

  const currentLessonData = (currentLessonSnapshot.data() ?? {}) as Record<string, unknown>;
  const currentOrder = Number(currentLessonData.order ?? 0);

  const nextLessonSnapshot = await getDocs(
    query(
      lessonCollection(courseId),
      where("order", ">", currentOrder),
      orderBy("order", "asc"),
      limit(1),
    ),
  );

  const nextLessonId = nextLessonSnapshot.docs[0]?.id;

  const payload: Record<string, unknown> = {
    completedLessons: arrayUnion(lessonId),
    updatedAt: serverTimestamp(),
  };

  if (nextLessonId) {
    payload.unlockedLessons = arrayUnion(nextLessonId);
  }

  await updateDoc(enrollmentRef, payload);
  await updateEnrollmentProgress(enrollment.id, courseId);
}

export function canUnlockLesson(
  enrollment: Enrollment,
  lessonId: string,
  previousLessonCompleted: boolean,
): boolean {
  return (
    enrollment.unlockedLessons.includes(lessonId) ||
    previousLessonCompleted
  );
}
