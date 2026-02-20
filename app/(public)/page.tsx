"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import CartButton from "@/components/course/CartButton";
import CourseCard from "@/components/course/CourseCard";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useCourse } from "@/hooks/useCourse";
import { listUserEnrollments } from "@/services/enrollmentService";
import { listUserPayments } from "@/services/paymentService";

export default function HomePage() {
  const { courses, loading } = useCourse(undefined, { published: true, pageSize: 3 });
  const { profile } = useAuth();
  const [hiddenCourseIds, setHiddenCourseIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!profile || profile.role !== "student") {
      setHiddenCourseIds(new Set());
      return;
    }
    let active = true;
    (async () => {
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
          setHiddenCourseIds(new Set());
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [profile]);

  const visibleCourses = useMemo(
    () => courses.filter((course) => !hiddenCourseIds.has(course.id)),
    [courses, hiddenCourseIds],
  );

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:py-16">
      <div className="flex justify-end">
        <CartButton />
      </div>
      <section className="grid gap-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 md:grid-cols-2 md:items-center">
        <div className="space-y-4">
          <p className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            AdventSkool LMS
          </p>
          <h1 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
            Learn with a guided, mobile-first classroom experience.
          </h1>
          <p className="text-slate-600">
            Structured lessons, progress tracking, and role-based dashboards for students, teachers, and admins.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/courses">
              <Button>Browse Courses</Button>
            </Link>
            <Link href="/register">
              <Button variant="secondary">Create Student Account</Button>
            </Link>
          </div>
        </div>
        <div className="rounded-xl bg-slate-950 p-6 text-slate-100">
          <h2 className="mb-3 text-lg font-semibold">Platform Highlights</h2>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>Course upload with rich outlines and media.</li>
            <li>Progressive lesson unlock and quizzes.</li>
            <li>Admin analytics, user management, and notifications.</li>
            <li>Checkout + enrollment flow optimized for phones.</li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Featured Courses</h2>
          <Link href="/courses" className="text-sm font-semibold text-blue-700 hover:underline">
            View all
          </Link>
        </div>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-64 animate-pulse rounded-lg border border-slate-200 bg-slate-100" />
            ))}
          </div>
        ) : null}
        {!loading && visibleCourses.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {visibleCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : null}
        {!loading && visibleCourses.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
            No new courses to recommend right now.
          </p>
        ) : null}
      </section>
    </main>
  );
}
