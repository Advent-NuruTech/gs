export interface LessonUnlock {
  id: string;
  userId: string;
  courseId: string;
  lessonId: string;
  paymentId?: string;
  unlockedAt?: string;
}
