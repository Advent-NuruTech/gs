"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import { formatContent } from "@/lib/utils/formatContent";
import {
  addEnrollmentStudyMinutes,
  getEnrollmentByUserAndCourse,
  updateEnrollmentLastOpenedLesson,
} from "@/services/enrollmentService";
import {
  completeLessonForEnrollment,
  getLessonById,
  listCourseLessons,
} from "@/services/lessonService";
import { getQuizAttempt } from "@/services/quizAttemptService";
import { Enrollment } from "@/types/enrollment";
import { Lesson } from "@/types/lesson";

function buildYoutubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const normalized = url.trim();
  if (!normalized) return null;

  try {
    const parsed = new URL(normalized);
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "").slice(0, 11);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId.slice(0, 11)}`;
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      const embedIndex = pathParts.findIndex((part) => part === "embed" || part === "shorts");
      if (embedIndex >= 0 && pathParts[embedIndex + 1]) {
        return `https://www.youtube.com/embed/${pathParts[embedIndex + 1].slice(0, 11)}`;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export default function LessonViewPage() {
  const params = useParams<{ courseId: string; lessonId: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const { pushToast } = useNotificationContext();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      const [lessonData, enrollmentData, lessonsData, quizAttempt] = await Promise.all([
        getLessonById(params.courseId, params.lessonId),
        getEnrollmentByUserAndCourse(profile.id, params.courseId),
        listCourseLessons(params.courseId),
        getQuizAttempt(profile.id, params.courseId, params.lessonId),
      ]);
      setLesson(lessonData);
      setEnrollment(enrollmentData);
      setAllLessons(lessonsData);
      setQuizCompleted(Boolean(quizAttempt));

      if (enrollmentData) {
        await updateEnrollmentLastOpenedLesson(enrollmentData.id, params.lessonId);
      }
    }
    load();
  }, [params.courseId, params.lessonId, profile]);

  useEffect(() => {
    if (!enrollment) return;
    let sessionMinutes = 0;
    const interval = setInterval(async () => {
      await addEnrollmentStudyMinutes(enrollment.id, 30);
      sessionMinutes += 30;
      if (sessionMinutes % 60 === 0) {
        pushToast(`You are ${sessionMinutes / 60} hour(s) inside this course. Keep going.`, "info");
      } else {
        pushToast(`You are ${sessionMinutes} minutes inside this course. Keep going.`, "info");
      }
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [enrollment, pushToast]);

  const nextLesson = useMemo(() => {
    if (!lesson) return null;
    return allLessons.find((item) => item.order === lesson.order + 1) ?? null;
  }, [allLessons, lesson]);

  const previousLesson = useMemo(() => {
    if (!lesson) return null;
    return allLessons.find((item) => item.order === lesson.order - 1) ?? null;
  }, [allLessons, lesson]);

  const isUnlocked = useMemo(() => {
    if (!enrollment) return false;
    return (
      enrollment.unlockedLessons.includes(params.lessonId) ||
      enrollment.completedLessons.includes(params.lessonId)
    );
  }, [enrollment, params.lessonId]);

  const isLessonCompleted = useMemo(
    () => Boolean(enrollment?.completedLessons.includes(params.lessonId)),
    [enrollment, params.lessonId],
  );

  const renderedLessonContent = useMemo(() => {
    if (!lesson) return "";
    return formatContent(lesson.contentHTML);
  }, [lesson]);

  const lessonQuestions = useMemo(() => {
    if (!lesson) return [];
    return lesson.quiz?.length ? lesson.quiz : lesson.questions ?? [];
  }, [lesson]);

  const canMarkComplete = isLessonCompleted || lessonQuestions.length === 0 || quizCompleted;
  const videoEmbedUrl = useMemo(() => buildYoutubeEmbedUrl(lesson?.videoUrl), [lesson?.videoUrl]);

  const handleComplete = async () => {
    if (!enrollment || isLessonCompleted) return;
    if (!canMarkComplete) {
      pushToast("Complete the lesson quiz first.", "error");
      return;
    }

    setSaving(true);
    try {
      await completeLessonForEnrollment(enrollment, params.courseId, params.lessonId);
      const refreshed = await getEnrollmentByUserAndCourse(enrollment.userId, params.courseId);
      setEnrollment(refreshed);

      if (nextLesson) {
        router.push(`/dashboard/student/my-courses/${params.courseId}/lesson/${nextLesson.id}`);
      } else {
        router.push(`/dashboard/student/my-courses/${params.courseId}`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!lesson) return <div>Loading lesson...</div>;
  if (!isUnlocked) return <div>Lesson is locked. Complete the previous lesson first.</div>;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <article className="space-y-5">
        <Link href={`/dashboard/student/my-courses/${params.courseId}`} className="text-sm text-blue-700 hover:underline">
          Back to course
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{lesson.title}</h1>

        {videoEmbedUrl ? (
          <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
            <iframe
              className="aspect-video w-full"
              src={videoEmbedUrl}
              title={`Video lesson ${lesson.title}`}
              allowFullScreen
            />
          </section>
        ) : null}

        <div
          className="prose-content rounded-md border border-slate-200 bg-white p-4 text-slate-700 sm:p-5"
          dangerouslySetInnerHTML={{ __html: renderedLessonContent }}
        />

        {lessonQuestions.length > 0 ? (
          <section className="rounded-md border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="mb-2 text-lg font-semibold text-slate-900">Lesson Quiz</h2>
            <p className="mb-3 text-sm text-slate-600">
              Quiz is compulsory before this lesson can be marked complete.
            </p>
            <Link href={`/dashboard/student/my-courses/${params.courseId}/lesson/${params.lessonId}/quiz`}>
              <Button type="button" variant={quizCompleted ? "secondary" : "primary"}>
                {quizCompleted ? "Review Quiz Answers" : "Take Quiz"}
              </Button>
            </Link>
          </section>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {previousLesson ? (
            <Link href={`/dashboard/student/my-courses/${params.courseId}/lesson/${previousLesson.id}`}>
              <Button variant="secondary">Previous Lesson</Button>
            </Link>
          ) : null}
          <Button type="button" onClick={handleComplete} disabled={saving || isLessonCompleted || !canMarkComplete}>
            {isLessonCompleted ? "Lesson Completed" : saving ? "Saving..." : "Mark Lesson Complete"}
          </Button>
          {nextLesson && (enrollment?.unlockedLessons.includes(nextLesson.id) ?? false) ? (
            <Link href={`/dashboard/student/my-courses/${params.courseId}/lesson/${nextLesson.id}`}>
              <Button variant="secondary">Next Lesson</Button>
            </Link>
          ) : null}
        </div>
      </article>

      <aside className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 lg:sticky lg:top-4 lg:h-fit">
        <h2 className="text-base font-semibold text-slate-900">Course Curriculum</h2>
        {allLessons.map((item) => {
          const completed = enrollment?.completedLessons.includes(item.id) ?? false;
          const unlocked = enrollment?.unlockedLessons.includes(item.id) ?? false;
          const active = item.id === params.lessonId;
          const locked = !completed && !unlocked;

          return (
            <Link
              key={item.id}
              href={locked ? "#" : `/dashboard/student/my-courses/${params.courseId}/lesson/${item.id}`}
              className={`block rounded-md border px-3 py-2 text-sm ${
                active
                  ? "border-blue-300 bg-blue-50 text-blue-800"
                  : locked
                    ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/50"
              }`}
              onClick={(event) => {
                if (locked) event.preventDefault();
              }}
            >
              <p className="font-medium">
                {item.order}. {item.title}
              </p>
              <p className="text-xs">
                {completed ? "Completed" : unlocked ? "Unlocked" : "Locked"}
              </p>
            </Link>
          );
        })}
      </aside>
    </div>
  );
}
