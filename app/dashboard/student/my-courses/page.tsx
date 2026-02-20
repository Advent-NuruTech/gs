"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { listCourses } from "@/services/courseService";
import { listUserEnrollments } from "@/services/enrollmentService";
import { listUserPayments } from "@/services/paymentService";
import { Course } from "@/types/course";
import { Enrollment } from "@/types/enrollment";

interface CourseLookup {
  [courseId: string]: Course | undefined;
}

export default function MyCoursesPage() {
  const { profile } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [pendingCourseIds, setPendingCourseIds] = useState<string[]>([]);
  const [courseLookup, setCourseLookup] = useState<CourseLookup>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      setLoading(true);
      try {
        const [enrollmentRows, paymentRows, courseRows] = await Promise.all([
          listUserEnrollments(profile.id),
          listUserPayments(profile.id),
          listCourses({ pageSize: 100 }),
        ]);

        const pendingIds = paymentRows
          .filter((payment) => payment.status === "pending")
          .map((payment) => payment.courseId);

        const lookup = courseRows.courses.reduce<CourseLookup>((acc, course) => {
          acc[course.id] = course;
          return acc;
        }, {});

        setEnrollments(enrollmentRows);
        setPendingCourseIds(pendingIds);
        setCourseLookup(lookup);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [profile]);

  const activeEnrollments = useMemo(
    () => enrollments.filter((item) => item.status === "in_progress"),
    [enrollments],
  );

  const completedEnrollments = useMemo(
    () => enrollments.filter((item) => item.status === "completed"),
    [enrollments],
  );

  if (loading) {
    return <div className="rounded-md border border-slate-200 bg-white p-4">Loading your courses...</div>;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">My Courses</h2>

      {pendingCourseIds.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-amber-900">Pending Approval</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {pendingCourseIds.map((courseId) => (
              <article key={courseId} className="rounded-md border border-amber-200 bg-amber-50 p-4">
                <h4 className="text-lg font-semibold text-slate-900">
                  {courseLookup[courseId]?.title ?? "Pending Course"}
                </h4>
                <p className="text-sm text-amber-800">Payment submitted. Waiting for admin approval.</p>
                <Link
                  href={`/dashboard/student/my-courses/${courseId}`}
                  className="mt-2 inline-flex rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-800"
                >
                  View Outline
                </Link>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {activeEnrollments.length === 0 && completedEnrollments.length === 0 && pendingCourseIds.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-4 text-slate-600">No enrolled courses.</p>
      ) : null}

      {activeEnrollments.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900">In Progress</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {activeEnrollments.map((enrollment) => {
              const isRevised = enrollment.progress >= 100;
              const href = isRevised
                ? `/dashboard/student/my-courses/${enrollment.courseId}`
                : enrollment.lastOpenedLessonId
                  ? `/dashboard/student/my-courses/${enrollment.courseId}/lesson/${enrollment.lastOpenedLessonId}`
                  : `/dashboard/student/my-courses/${enrollment.courseId}`;

              return (
                <article key={enrollment.id} className="rounded-md border border-slate-200 bg-white p-4 sm:p-5">
                  <h4 className="text-lg font-semibold text-slate-900 break-words">
                    {courseLookup[enrollment.courseId]?.title ?? "Unknown Course"}
                  </h4>
                  <p className="text-sm text-slate-600">Progress: {enrollment.progress}%</p>
                  <Link
                    href={href}
                    className={`mt-2 inline-flex rounded-md px-3 py-2 text-sm font-semibold text-white ${
                      isRevised ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {isRevised ? "Revised" : "Continue"}
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}

      {completedEnrollments.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-emerald-900">Completed</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {completedEnrollments.map((enrollment) => (
              <article key={enrollment.id} className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
                <h4 className="text-lg font-semibold text-slate-900">
                  {courseLookup[enrollment.courseId]?.title ?? "Unknown Course"}
                </h4>
                <p className="text-sm text-emerald-800">You have completed this course.</p>
                <Link
                  href={`/dashboard/student/my-courses/${enrollment.courseId}`}
                  className="mt-2 inline-flex rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Revise
                </Link>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
