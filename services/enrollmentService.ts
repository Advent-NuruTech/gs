import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase/config";
import { enrollmentDoc, lessonCollection, usersCollection } from "@/lib/firebase/firestore";
import { createNotification } from "@/services/notificationService";
import { Enrollment } from "@/types/enrollment";

function mapEnrollment(
  id: string,
  data: Record<string, unknown>,
): Enrollment {
  return {
    id,
    userId: String(data.userId ?? ""),
    courseId: String(data.courseId ?? ""),
    completedLessons: (data.completedLessons as string[]) ?? [],
    unlockedLessons: (data.unlockedLessons as string[]) ?? [],
    progress: Number(data.progress ?? 0),
    status: (data.status as Enrollment["status"]) ?? "in_progress",
    lastOpenedLessonId: data.lastOpenedLessonId ? String(data.lastOpenedLessonId) : undefined,
    totalStudyMinutes: Number(data.totalStudyMinutes ?? 0),
    enrolledAt: (data.enrolledAt as { toDate?: () => Date })?.toDate?.().toISOString(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.().toISOString(),
  };
}

export async function enrollUserInCourse(
  userId: string,
  courseId: string,
): Promise<string> {
  const firstLessonSnapshot = await getDocs(
    query(lessonCollection(courseId), where("order", "==", 1)),
  );
  const firstLessonId = firstLessonSnapshot.docs[0]?.id;

  const enrollmentId = `${userId}_${courseId}`;
  const existing = await getDoc(enrollmentDoc(enrollmentId));
  if (existing.exists()) return existing.id;

  await setDoc(enrollmentDoc(enrollmentId), {
    userId,
    courseId,
    completedLessons: [],
    unlockedLessons: firstLessonId ? [firstLessonId] : [],
    progress: 0,
    status: "in_progress",
    lastOpenedLessonId: firstLessonId ?? "",
    totalStudyMinutes: 0,
    enrolledAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    const adminSnapshots = await getDocs(query(usersCollection(), where("role", "==", "admin")));
    await Promise.all(
      adminSnapshots.docs.map((adminDoc) =>
        createNotification({
          userId: adminDoc.id,
          title: "New Enrollment",
          message: `A student enrolled in course ${courseId}.`,
          link: `/dashboard/admin/analytics`,
        }),
      ),
    );
  } catch {
    // Enrollment should not fail if notifications cannot be written.
  }

  return enrollmentId;
}

export async function getEnrollmentByUserAndCourse(
  userId: string,
  courseId: string,
): Promise<Enrollment | null> {
  const snapshot = await getDocs(
    query(
      collection(db, "enrollments"),
      where("userId", "==", userId),
      where("courseId", "==", courseId),
    ),
  );

  const firstDoc = snapshot.docs[0];
  if (!firstDoc) return null;

  return mapEnrollment(firstDoc.id, firstDoc.data());
}

export async function updateEnrollmentProgress(
  enrollmentId: string,
  courseId: string,
): Promise<void> {
  const [enrollmentSnapshot, lessonsSnapshot] = await Promise.all([
    getDoc(doc(db, "enrollments", enrollmentId)),
    getDocs(lessonCollection(courseId)),
  ]);

  if (!enrollmentSnapshot.exists()) {
    throw new Error("Enrollment does not exist.");
  }

  const enrollmentData = (enrollmentSnapshot.data() ?? {}) as Record<string, unknown>;
  const completedLessons = (enrollmentData.completedLessons as string[]) ?? [];
  const totalLessons = lessonsSnapshot.size;
  const progress = totalLessons
    ? Math.min(100, Math.round((completedLessons.length / totalLessons) * 100))
    : 0;
  const status: Enrollment["status"] = progress >= 100 ? "completed" : "in_progress";

  await updateDoc(doc(db, "enrollments", enrollmentId), {
    progress,
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function listUserEnrollments(userId: string): Promise<Enrollment[]> {
  const snapshot = await getDocs(
    query(collection(db, "enrollments"), where("userId", "==", userId)),
  );
  return snapshot.docs.map((docSnapshot) => mapEnrollment(docSnapshot.id, docSnapshot.data()));
}

export async function listAllEnrollments(): Promise<Enrollment[]> {
  const snapshot = await getDocs(collection(db, "enrollments"));
  return snapshot.docs.map((docSnapshot) => mapEnrollment(docSnapshot.id, docSnapshot.data()));
}

export async function updateEnrollmentLastOpenedLesson(
  enrollmentId: string,
  lessonId: string,
): Promise<void> {
  await updateDoc(enrollmentDoc(enrollmentId), {
    lastOpenedLessonId: lessonId,
    updatedAt: serverTimestamp(),
  });
}

export async function addEnrollmentStudyMinutes(
  enrollmentId: string,
  minutes: number,
): Promise<void> {
  const snapshot = await getDoc(enrollmentDoc(enrollmentId));
  if (!snapshot.exists()) return;

  const data = (snapshot.data() ?? {}) as Record<string, unknown>;
  const currentTotal = Number(data.totalStudyMinutes ?? 0);

  await updateDoc(enrollmentDoc(enrollmentId), {
    totalStudyMinutes: currentTotal + minutes,
    updatedAt: serverTimestamp(),
  });
}
