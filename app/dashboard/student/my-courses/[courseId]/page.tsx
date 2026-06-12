"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import LessonUnlock from "@/components/course/LessonUnlock";
import ProgressBar from "@/components/ui/ProgressBar";
import { useAuth } from "@/hooks/useAuth";
import { formatContent } from "@/lib/utils/formatContent";
import { getCourseById } from "@/services/courseService";
import { getEnrollmentByUserAndCourse } from "@/services/enrollmentService";
import { listCourseLessons } from "@/services/lessonService";
import { Course } from "@/types/course";
import { Enrollment } from "@/types/enrollment";
import { Lesson } from "@/types/lesson";

export default function StudentCoursePage() {
  const params = useParams<{ courseId: string }>();
  const { profile } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!params.courseId || !profile) return;
      setLoading(true);
      try {
        const [courseData, lessonsData, enrollmentData] = await Promise.all([
          getCourseById(params.courseId),
          listCourseLessons(params.courseId),
          getEnrollmentByUserAndCourse(profile.id, params.courseId),
        ]);
        setCourse(courseData);
        setLessons(lessonsData);
        setEnrollment(enrollmentData);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.courseId, profile]);

  const unlockedSet = useMemo(
    () => new Set([...(enrollment?.unlockedLessons ?? []), ...(enrollment?.completedLessons ?? [])]),
    [enrollment],
  );
  const hasLocked = useMemo(
    () => lessons.some((lesson) => !unlockedSet.has(lesson.id)),
    [lessons, unlockedSet],
  );

  if (loading) {
    return <div className="rounded-md border border-slate-200 bg-white p-4 text-slate-600">Loading course...</div>;
  }
  if (!course) {
    return <div className="rounded-md border border-slate-200 bg-white p-4 text-slate-600">Course not found.</div>;
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <h2 className="text-2xl font-bold text-slate-900 break-words sm:text-3xl">{course.title}</h2>
      <div
        className="prose-content overflow-hidden rounded-xl border border-slate-200 bg-white p-4 text-slate-700 sm:p-6"
        dangerouslySetInnerHTML={{ __html: formatContent(course.outline) }}
      />

      {enrollment ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <ProgressBar value={enrollment.progress} />
        </div>
      ) : null}

      {hasLocked ? (
        <div className="flex flex-col gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-indigo-900">
            Some lessons are locked. Unlock the full course or pick individual lessons.
          </p>
          <Link
            href={`/courses/${params.courseId}/checkout`}
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Buy lessons
          </Link>
        </div>
      ) : null}

      <div className="space-y-3">
        {lessons.map((lesson) => {
          const unlocked = unlockedSet.has(lesson.id);
          return (
            <article key={lesson.id} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <h3 className="text-base font-semibold text-slate-900 break-words">
                    {lesson.order}. {lesson.title}
                  </h3>
                  <LessonUnlock enrollment={enrollment} lessonId={lesson.id} />
                </div>
                {unlocked ? (
                  <Link
                    href={`/dashboard/student/my-courses/${params.courseId}/lesson/${lesson.id}`}
                    className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto"
                  >
                    Open Lesson
                  </Link>
                ) : (
                  <Link
                    href={`/courses/${params.courseId}/checkout?lesson=${lesson.id}`}
                    className="inline-flex w-full items-center justify-center rounded-md border border-indigo-300 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 sm:w-auto"
                  >
                    Unlock
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
