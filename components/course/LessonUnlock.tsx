import { Enrollment } from "@/types/enrollment";

interface LessonUnlockProps {
  enrollment: Enrollment | null;
  lessonId: string;
}

export default function LessonUnlock({ enrollment, lessonId }: LessonUnlockProps) {
  const isUnlocked = enrollment?.unlockedLessons?.includes(lessonId) ?? false;
  const isCompleted = enrollment?.completedLessons?.includes(lessonId) ?? false;

  return (
    <div
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        isCompleted
          ? "bg-emerald-100 text-emerald-700"
          : isUnlocked
            ? "bg-blue-100 text-blue-700"
            : "bg-slate-200 text-slate-600"
      }`}
    >
      {isCompleted ? "Completed" : isUnlocked ? "Unlocked" : "Locked"}
    </div>
  );
}
