"use client";

import { useEffect, useMemo, useState } from "react";

import CartButton from "@/components/course/CartButton";
import CourseCard from "@/components/course/CourseCard";
import { useAuth } from "@/hooks/useAuth";
import { useCourse } from "@/hooks/useCourse";
import { listUserEnrollments } from "@/services/enrollmentService";
import { listUserPayments } from "@/services/paymentService";

export default function CoursesPage() {
  const { courses, loading } = useCourse(undefined, { published: true, pageSize: 12 });
  const { profile } = useAuth();
  const [hiddenCourseIds, setHiddenCourseIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;

    const loadHiddenCourses = async () => {
      if (!profile || profile.role !== "student") {
        if (active) {
          setHiddenCourseIds((current) => (current.size === 0 ? current : new Set()));
        }
        return;
      }

      try {
        const [enrollments, payments] = await Promise.all([
          listUserEnrollments(profile.id),
          listUserPayments(profile.id),
        ]);

        if (!active) return;

        const hidden = new Set<string>();
        for (const enrollment of enrollments) {
          hidden.add(enrollment.courseId);
        }
        for (const payment of payments) {
          if (payment.status === "pending" || payment.status === "approved") {
            hidden.add(payment.courseId);
          }
        }
        setHiddenCourseIds(hidden);
      } catch {
        if (active) {
          setHiddenCourseIds((current) => (current.size === 0 ? current : new Set()));
        }
      }
    };

    loadHiddenCourses();

    return () => {
      active = false;
    };
  }, [profile]);

  const visibleCourses = useMemo(
    () => courses.filter((course) => !hiddenCourseIds.has(course.id)),
    [courses, hiddenCourseIds],
  );

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-slate-900">All Courses</h1>
        <CartButton />
      </div>
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-lg border border-slate-200 bg-slate-100"
            />
          ))}
        </div>
      ) : null}
      {!loading && visibleCourses.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-6 text-slate-600">
          {profile?.role === "student"
            ? "No new courses available right now. Check back later."
            : "No published courses yet."}
        </p>
      ) : null}
      {!loading && visibleCourses.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : null}
    </main>
  );
}
