"use client";

import CartButton from "@/components/course/CartButton";
import CourseCard from "@/components/course/CourseCard";
import { useCourse } from "@/hooks/useCourse";

export default function CoursesPage() {
  const { courses, loading } = useCourse(undefined, { published: true, pageSize: 12 });

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
      {!loading && courses.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-6 text-slate-600">
          No published courses yet.
        </p>
      ) : null}
      {!loading && courses.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : null}
    </main>
  );
}
