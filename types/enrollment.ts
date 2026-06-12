export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  completedLessons: string[];
  unlockedLessons: string[];
  progress: number;
  status: "in_progress" | "completed";
  lastOpenedLessonId?: string;
  totalStudyMinutes: number;
  enrolledAt?: string;
  updatedAt?: string;
}
