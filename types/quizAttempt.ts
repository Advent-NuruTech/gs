export interface QuizAttempt {
  id: string;
  userId: string;
  courseId: string;
  lessonId: string;
  answers: Record<string, string>;
  score: number;
  totalQuestions: number;
  submittedAt?: string;
  updatedAt?: string;
}

