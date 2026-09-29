"use client";

import { useEffect, useMemo, useState } from "react";

import CatalogFilterBar from "@/components/catalog/CatalogFilterBar";
import CartButton from "@/components/course/CartButton";
import CourseCard from "@/components/course/CourseCard";
import { useAuth } from "@/hooks/useAuth";
import { useCourse } from "@/hooks/useCourse";
import { listUserEnrollments } from "@/services/enrollmentService";
import { listUserPayments } from "@/services/paymentService";

export default function CoursesPage() {
  const { courses, loading } = useCourse(undefined, { published: true, pageSize: 200 });
  const { profile } = useAuth();
  const [hiddenCourseIds, setHiddenCourseIds] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [courseSearch, setCourseSearch] = useState<string>("");

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
          if (payment.status === "success") {
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

  const availableCategories = useMemo(() => {
    return [...new Set(visibleCourses.map((course) => course.category || "General"))].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [visibleCourses]);

  const resolvedCategory =
    activeCategory === "All" || availableCategories.includes(activeCategory)
      ? activeCategory
      : "All";

  const filteredCourses = useMemo(() => {
    const query = courseSearch.trim().toLocaleLowerCase();
    return visibleCourses.filter((course) => {
      const matchesCategory =
        resolvedCategory === "All" || (course.category || "General") === resolvedCategory;
      const matchesSearch =
        !query ||
        course.title.toLocaleLowerCase().includes(query) ||
        (course.category || "General").toLocaleLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [courseSearch, resolvedCategory, visibleCourses]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-slate-900">All Courses</h1>
        <CartButton />
      </div>
      <CatalogFilterBar
        query={courseSearch}
        onQueryChange={setCourseSearch}
        searchPlaceholder="Search courses"
        searchLabel="Search courses"
        categories={availableCategories}
        activeCategory={resolvedCategory}
        onCategoryChange={setActiveCategory}
        resultCount={filteredCourses.length}
        totalCount={visibleCourses.length}
        itemLabel={filteredCourses.length === 1 ? "course" : "courses"}
        innerMaxWidth="max-w-5xl"
      />
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-lg border border-slate-200 bg-slate-100"
            />
          ))}
        </div>
      ) : null}
      {!loading && filteredCourses.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-6 text-slate-600">
          {courseSearch || resolvedCategory !== "All"
            ? `No published courses found in ${resolvedCategory}.`
            : profile?.role === "student"
              ? "No new courses available right now. Check back later."
              : "No published courses yet."}
        </p>
      ) : null}
      {!loading && filteredCourses.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {filteredCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : null}
    </main>
  );
}
