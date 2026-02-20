"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import CourseCard from "@/components/course/CourseCard";
import ProgressBar from "@/components/ui/ProgressBar";
import { useAuth } from "@/hooks/useAuth";
import { listCourses } from "@/services/courseService";
import { listUserEnrollments } from "@/services/enrollmentService";
import { listUserPayments } from "@/services/paymentService";
import { Course } from "@/types/course";
import { Enrollment } from "@/types/enrollment";

interface CourseByIdMap {
  [courseId: string]: Course | null;
}

export default function StudentDashboardPage() {
  const { profile } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [pendingCourseIds, setPendingCourseIds] = useState<string[]>([]);
  const [coursesById, setCoursesById] = useState<CourseByIdMap>({});
  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      setLoading(true);
      try {
        const [enrollmentRows, paymentRows, allCoursesResult] = await Promise.all([
          listUserEnrollments(profile.id),
          listUserPayments(profile.id),
          listCourses({ published: true, pageSize: 50 }),
        ]);

        const pendingIds = paymentRows
          .filter((payment) => payment.status === "pending")
          .map((payment) => payment.courseId);

        const uniqueCourseIds = new Set<string>([
          ...enrollmentRows.map((item) => item.courseId),
          ...pendingIds,
        ]);

        const resolvedCourses = allCoursesResult.courses.reduce<CourseByIdMap>((acc, course) => {
          if (uniqueCourseIds.has(course.id)) {
            acc[course.id] = course;
          }
          return acc;
        }, {});

        setEnrollments(enrollmentRows);
        setPendingCourseIds(pendingIds);
        setCoursesById(resolvedCourses);

        const excludedIds = new Set([...uniqueCourseIds]);
        setRecommendedCourses(
          allCoursesResult.courses.filter((course) => !excludedIds.has(course.id)).slice(0, 4),
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [profile]);

  const activeEnrollments = useMemo(
    () => enrollments.filter((enrollment) => enrollment.status === "in_progress"),
    [enrollments],
  );

  const completedEnrollments = useMemo(
    () => enrollments.filter((enrollment) => enrollment.status === "completed"),
    [enrollments],
  );

  if (loading) {
    return <div className="rounded-md border border-slate-200 bg-white p-4">Loading student dashboard...</div>;
  }

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Student Dashboard</h2>

      {pendingCourseIds.length > 0 ? (
        <article className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-lg font-semibold text-amber-900">Pending Course Approvals</h3>
          <p className="text-sm text-amber-800">
            Your payment was submitted. You can view course outlines while access is pending admin approval.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {pendingCourseIds.map((courseId) => (
              <Link
                key={courseId}
                href={`/dashboard/student/my-courses/${courseId}`}
                className="inline-flex rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-800"
              >
                {coursesById[courseId]?.title ?? "Pending Course"}
              </Link>
            ))}
          </div>
        </article>
      ) : null}

      {enrollments.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-4 text-slate-600">
          You are not enrolled in any course yet.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {activeEnrollments.map((enrollment) => {
            const isRevised = enrollment.progress >= 100;
            const href = isRevised
              ? `/dashboard/student/my-courses/${enrollment.courseId}`
              : enrollment.lastOpenedLessonId
                ? `/dashboard/student/my-courses/${enrollment.courseId}/lesson/${enrollment.lastOpenedLessonId}`
                : `/dashboard/student/my-courses/${enrollment.courseId}`;

            return (
              <article key={enrollment.id} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
                <h3 className="text-lg font-semibold text-slate-900 break-words">
                  {coursesById[enrollment.courseId]?.title ?? "Unknown course"}
                </h3>
                <ProgressBar value={enrollment.progress} />
                <Link
                  href={href}
                  className={`inline-flex rounded-md px-3 py-2 text-sm font-semibold text-white ${
                    isRevised ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isRevised ? "Revised" : "Continue"}
                </Link>
              </article>
            );
          })}

          {completedEnrollments.map((enrollment) => (
            <article key={enrollment.id} className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
              <h3 className="text-lg font-semibold text-slate-900 break-words">
                {coursesById[enrollment.courseId]?.title ?? "Unknown course"}
              </h3>
              <ProgressBar value={100} />
              <Link
                href={`/dashboard/student/my-courses/${enrollment.courseId}`}
                className="inline-flex rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Revised
              </Link>
            </article>
          ))}
        </div>
      )}

      <section className="space-y-3">
        <h3 className="text-xl font-bold text-slate-900">Other Courses You May Like</h3>
        {recommendedCourses.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-white p-4 text-slate-600">
            Explore more courses from the catalog.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recommendedCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
