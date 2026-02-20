import { arrayUnion, doc, getDoc, updateDoc } from "firebase/firestore";

import { db } from "@/lib/firebase/config";
import { QuizQuestion } from "@/types/quiz";

export async function addQuizQuestion(
  courseId: string,
  lessonId: string,
  question: QuizQuestion,
): Promise<void> {
  await updateDoc(doc(db, "courses", courseId, "lessons", lessonId), {
    quiz: arrayUnion(question),
    questions: arrayUnion(question),
  });
}

export async function getLessonQuiz(
  courseId: string,
  lessonId: string,
): Promise<QuizQuestion[]> {
  const snapshot = await getDoc(doc(db, "courses", courseId, "lessons", lessonId));
  if (!snapshot.exists()) return [];

  const data = (snapshot.data() ?? {}) as Record<string, unknown>;
  return (data.quiz as QuizQuestion[]) ?? (data.questions as QuizQuestion[]) ?? [];
}
