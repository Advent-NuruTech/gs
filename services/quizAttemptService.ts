import { getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { quizAttemptDoc } from "@/lib/firebase/firestore";
import { QuizAttempt } from "@/types/quizAttempt";

function attemptId(userId: string, courseId: string, lessonId: string) {
  return `${userId}_${courseId}_${lessonId}`;
}

function mapAttempt(id: string, data: Record<string, unknown>): QuizAttempt {
  return {
    id,
    userId: String(data.userId ?? ""),
    courseId: String(data.courseId ?? ""),
    lessonId: String(data.lessonId ?? ""),
    answers: (data.answers as Record<string, string>) ?? {},
    score: Number(data.score ?? 0),
    totalQuestions: Number(data.totalQuestions ?? 0),
    submittedAt: (data.submittedAt as { toDate?: () => Date })?.toDate?.().toISOString(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.().toISOString(),
  };
}

export async function getQuizAttempt(
  userId: string,
  courseId: string,
  lessonId: string,
): Promise<QuizAttempt | null> {
  const id = attemptId(userId, courseId, lessonId);
  const snapshot = await getDoc(quizAttemptDoc(id));
  if (!snapshot.exists()) return null;
  return mapAttempt(snapshot.id, snapshot.data() as Record<string, unknown>);
}

export async function saveQuizAttempt(input: {
  userId: string;
  courseId: string;
  lessonId: string;
  answers: Record<string, string>;
  score: number;
  totalQuestions: number;
}): Promise<void> {
  const id = attemptId(input.userId, input.courseId, input.lessonId);
  await setDoc(quizAttemptDoc(id), {
    ...input,
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

