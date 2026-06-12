"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import { getEnrollmentByUserAndCourse } from "@/services/enrollmentService";
import { getLessonById } from "@/services/lessonService";
import { getQuizAttempt, saveQuizAttempt } from "@/services/quizAttemptService";
import { Enrollment } from "@/types/enrollment";
import { Lesson } from "@/types/lesson";
import { QuizQuestion } from "@/types/quiz";
import { QuizAttempt } from "@/types/quizAttempt";

interface GenerationResponse {
  source: "huggingface" | "fallback";
  questions: QuizQuestion[];
}

export default function LessonQuizPage() {
  const params = useParams<{ courseId: string; lessonId: string }>();
  const router = useRouter();
  const { pushToast } = useNotificationContext();
  const { profile } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [generatedQuestions, setGeneratedQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      setLoading(true);
      try {
        const [lessonData, enrollmentData, attemptData] = await Promise.all([
          getLessonById(params.courseId, params.lessonId),
          getEnrollmentByUserAndCourse(profile.id, params.courseId),
          getQuizAttempt(profile.id, params.courseId, params.lessonId),
        ]);
        setLesson(lessonData);
        setEnrollment(enrollmentData);
        setAttempt(attemptData);
        setAnswers(attemptData?.answers ?? {});
        setGeneratedQuestions([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.courseId, params.lessonId, profile]);

  const questions = useMemo(() => {
    if (!lesson) return [];
    const baseQuestions = lesson.quiz?.length ? lesson.quiz : lesson.questions ?? [];
    return baseQuestions.length ? baseQuestions : generatedQuestions;
  }, [generatedQuestions, lesson]);

  const isRevisionMode = enrollment?.status === "completed";

  useEffect(() => {
    async function generateIfNeeded() {
      if (!lesson || !isRevisionMode || questions.length > 0 || generating) return;
      setGenerating(true);
      try {
        const response = await fetch("/api/quiz/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonTitle: lesson.title,
            lessonContent: lesson.contentHTML,
            count: 10,
          }),
        });
        if (!response.ok) throw new Error("AI quiz generation failed.");
        const payload = (await response.json()) as GenerationResponse;
        if (!payload.questions.length) return;
        setGeneratedQuestions(payload.questions);
        pushToast(
          payload.source === "huggingface"
            ? "Revision quiz generated with AI."
            : "Revision quiz generated with fallback mode.",
          "success",
        );
      } catch (error) {
        pushToast(error instanceof Error ? error.message : "Could not generate revision quiz.", "error");
      } finally {
        setGenerating(false);
      }
    }

    generateIfNeeded();
  }, [generating, isRevisionMode, lesson, params.courseId, params.lessonId, pushToast, questions.length]);

  const score = useMemo(() => {
    if (!questions.length) return 0;
    return questions.reduce((total, question) => {
      return answers[question.id] === question.correctOptionId ? total + 1 : total;
    }, 0);
  }, [answers, questions]);

  const canSubmit = questions.length > 0 && questions.every((question) => Boolean(answers[question.id]));

  const handleSubmit = async () => {
    if (!profile || !questions.length || !canSubmit) return;
    setSubmitting(true);
    try {
      await saveQuizAttempt({
        userId: profile.id,
        courseId: params.courseId,
        lessonId: params.lessonId,
        answers,
        score,
        totalQuestions: questions.length,
      });
      const saved = await getQuizAttempt(profile.id, params.courseId, params.lessonId);
      setAttempt(saved);
      pushToast("Quiz answers submitted and saved.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Quiz submit failed.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Loading quiz...</div>;
  if (!lesson || !enrollment) {
    return (
      <section className="space-y-4">
        <p className="rounded-md border border-slate-200 bg-white p-4 text-slate-600">
          Lesson or enrollment not found.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <Link href={`/dashboard/student/my-courses/${params.courseId}/lesson/${params.lessonId}`} className="text-sm text-blue-700 hover:underline">
        Back to lesson
      </Link>

      <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
        <h1 className="text-xl font-bold text-slate-900">Lesson Quiz: {lesson.title}</h1>
        <p className="text-sm text-slate-600">
          Students must complete this quiz before marking the lesson complete.
          {isRevisionMode ? " Revision mode is active for this completed course." : ""}
        </p>
      </div>

      {!questions.length ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
          {isRevisionMode
            ? generating
              ? "Generating revision quiz..."
              : "No quiz questions available for this lesson."
            : "No quiz available yet. Ask your teacher/admin to add quiz questions."}
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((question, index) => (
            <article key={question.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-900">
                {index + 1}. {question.question}
              </p>
              <div className="mt-2 space-y-2">
                {question.options.map((option) => {
                  const selected = answers[question.id] === option.id;
                  const isCorrect = option.id === question.correctOptionId;
                  const showReview = Boolean(attempt);
                  const rowClass = showReview
                    ? isCorrect
                      ? "border-emerald-300 bg-emerald-50"
                      : selected
                        ? "border-red-300 bg-red-50"
                        : "border-slate-200 bg-white"
                    : selected
                      ? "border-blue-300 bg-blue-50"
                      : "border-slate-200 bg-white";

                  return (
                    <label key={option.id} className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm ${rowClass}`}>
                      <input
                        type="radio"
                        name={`q_${question.id}`}
                        checked={selected}
                        disabled={Boolean(attempt)}
                        onChange={() => {
                          if (attempt) return;
                          setAnswers((prev) => ({ ...prev, [question.id]: option.id }));
                        }}
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
              {attempt ? (
                <p className="mt-2 text-xs text-slate-600">
                  {answers[question.id] === question.correctOptionId ? "Correct." : "Incorrect."}{" "}
                  {question.explanation ? `Explanation: ${question.explanation}` : ""}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {questions.length > 0 && !attempt ? (
        <Button type="button" disabled={submitting || !canSubmit} onClick={handleSubmit}>
          {submitting ? "Submitting..." : "Submit Quiz"}
        </Button>
      ) : null}

      {attempt ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600">Last submitted score</p>
          <p className="text-2xl font-bold text-slate-900">
            {attempt.score}/{attempt.totalQuestions}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push(`/dashboard/student/my-courses/${params.courseId}/lesson/${params.lessonId}`)}
            >
              Return To Lesson
            </Button>
            {isRevisionMode ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setAttempt(null);
                  setAnswers({});
                }}
              >
                Retake For Revision
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
