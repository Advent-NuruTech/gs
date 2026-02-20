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
import { getUserPaymentForCourse } from "@/services/paymentService";
import { Course } from "@/types/course";
import { Enrollment } from "@/types/enrollment";
import { Lesson } from "@/types/lesson";
import { Payment } from "@/types/payment";

export default function StudentCoursePage() {
  const params = useParams<{ courseId: string }>();
  const { profile } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!params.courseId || !profile) return;
      setLoading(true);
      try {
        const [courseData, lessonsData, enrollmentData, paymentData] = await Promise.all([
          getCourseById(params.courseId),
          listCourseLessons(params.courseId),
          getEnrollmentByUserAndCourse(profile.id, params.courseId),
          getUserPaymentForCourse(profile.id, params.courseId),
        ]);
        setCourse(courseData);
        setLessons(lessonsData);
        setEnrollment(enrollmentData);
        setPayment(paymentData);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.courseId, profile]);

  const pendingApproval = useMemo(
    () => !enrollment && payment?.status === "pending",
    [enrollment, payment],
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

      {pendingApproval ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Your payment is pending approval. You can review this outline, but lessons are locked until admin approves.
        </div>
      ) : null}

      {enrollment ? (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <ProgressBar value={enrollment.progress} />
          </div>
          {enrollment.status === "completed" ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Course completed. You can now revise lessons and quizzes.
            </div>
          ) : null}
        </>
      ) : null}

      {!pendingApproval && !enrollment ? (
        <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
          You are not enrolled in this course yet.
        </div>
      ) : null}

      {enrollment ? (
        <div className="space-y-3">
          {lessons.map((lesson) => (
            <article key={lesson.id} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <h3 className="text-base font-semibold text-slate-900 break-words">
                    {lesson.order}. {lesson.title}
                  </h3>
                  <LessonUnlock enrollment={enrollment} lessonId={lesson.id} />
                </div>
                {(enrollment.unlockedLessons ?? []).includes(lesson.id) ||
                (enrollment.completedLessons ?? []).includes(lesson.id) ? (
                  <Link
                    href={`/dashboard/student/my-courses/${params.courseId}/lesson/${lesson.id}`}
                    className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto"
                  >
                    Open Lesson
                  </Link>
                ) : (
                  <span className="text-sm text-slate-500">Locked</span>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
