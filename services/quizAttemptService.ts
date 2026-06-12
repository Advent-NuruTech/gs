import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { QuizAttempt } from "@/types/quizAttempt";

const supabase = getSupabaseBrowserClient();

function mapAttempt(data: Record<string, unknown>): QuizAttempt {
  return {
    id: String(data.id ?? ""),
    userId: String(data.user_id ?? ""),
    courseId: String(data.course_id ?? ""),
    lessonId: String(data.lesson_id ?? ""),
    answers: (data.answers as Record<string, string>) ?? {},
    score: Number(data.score ?? 0),
    totalQuestions: Number(data.total ?? 0),
    submittedAt: data.created_at ? String(data.created_at) : undefined,
    updatedAt: data.created_at ? String(data.created_at) : undefined,
  };
}

export async function getQuizAttempt(
  userId: string,
  courseId: string,
  lessonId: string,
): Promise<QuizAttempt | null> {
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .eq("lesson_id", lessonId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapAttempt(data) : null;
}

export async function saveQuizAttempt(input: {
  userId: string;
  courseId: string;
  lessonId: string;
  answers: Record<string, string>;
  score: number;
  totalQuestions: number;
}): Promise<void> {
  const { error } = await supabase.from("quiz_attempts").upsert(
    {
      user_id: input.userId,
      course_id: input.courseId,
      lesson_id: input.lessonId,
      answers: input.answers,
      score: input.score,
      total: input.totalQuestions,
      passed: input.totalQuestions > 0 && input.score >= input.totalQuestions,
    },
    { onConflict: "user_id,lesson_id" },
  );
  if (error) throw new Error(error.message);
}
