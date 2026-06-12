import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { QuizQuestion } from "@/types/quiz";

const supabase = getSupabaseBrowserClient();

export async function addQuizQuestion(
  _courseId: string,
  lessonId: string,
  question: QuizQuestion,
): Promise<void> {
  const { data, error } = await supabase
    .from("lessons")
    .select("quiz")
    .eq("id", lessonId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const quiz = ((data?.quiz as QuizQuestion[]) ?? []).concat(question);
  const { error: updateError } = await supabase
    .from("lessons")
    .update({ quiz })
    .eq("id", lessonId);
  if (updateError) throw new Error(updateError.message);
}

export async function getLessonQuiz(
  _courseId: string,
  lessonId: string,
): Promise<QuizQuestion[]> {
  const { data, error } = await supabase
    .from("lessons")
    .select("quiz")
    .eq("id", lessonId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.quiz as QuizQuestion[]) ?? [];
}
