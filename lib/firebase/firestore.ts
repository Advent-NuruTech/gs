import { collection, doc } from "firebase/firestore";

import { db } from "@/lib/firebase/config";

export const usersCollection = () => collection(db, "users");
export const coursesCollection = () => collection(db, "courses");
export const enrollmentsCollection = () => collection(db, "enrollments");
export const notificationsCollection = () => collection(db, "notifications");
export const teacherInvitesCollection = () => collection(db, "teacherInvites");
export const paymentsCollection = () => collection(db, "payments");
export const quizAttemptsCollection = () => collection(db, "quizAttempts");

export const courseDoc = (courseId: string) => doc(db, "courses", courseId);
export const lessonCollection = (courseId: string) =>
  collection(db, "courses", courseId, "lessons");
export const enrollmentDoc = (enrollmentId: string) =>
  doc(db, "enrollments", enrollmentId);
export const userDoc = (userId: string) => doc(db, "users", userId);
export const teacherInviteDoc = (inviteId: string) => doc(db, "teacherInvites", inviteId);
export const paymentDoc = (paymentId: string) => doc(db, "payments", paymentId);
export const quizAttemptDoc = (quizAttemptId: string) => doc(db, "quizAttempts", quizAttemptId);
export const notificationDoc = (notificationId: string) => doc(db, "notifications", notificationId);
