"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

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
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [courseSearch, setCourseSearch] = useState("");

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

  const categoryOptions = useMemo(() => {
    const query = categorySearch.trim().toLocaleLowerCase();
    return ["All", ...availableCategories].filter((category) =>
      category.toLocaleLowerCase().includes(query),
    );
  }, [availableCategories, categorySearch]);

  const selectCategory = (category: string) => {
    setActiveCategory(category);
    setCategorySearch("");
    setCategoryPickerOpen(false);
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-slate-900">All Courses</h1>
        <CartButton />
      </div>
      <div className="sticky top-0 z-30 -mx-4 border-y border-slate-200 bg-slate-50/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-3 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
            <Search className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
            <input type="search" value={courseSearch} onChange={(event) => setCourseSearch(event.target.value)} placeholder="Search courses" className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" />
          </label>
          {availableCategories.length > 0 ? (
            <div className="relative sm:w-80">
          <button
            type="button"
            aria-expanded={categoryPickerOpen}
            aria-haspopup="listbox"
            onClick={() => setCategoryPickerOpen((open) => !open)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <span>Category: {resolvedCategory}</span>
            <ChevronDown
              className={`h-5 w-5 text-slate-500 transition-transform ${categoryPickerOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
          {categoryPickerOpen ? (
            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                <input
                  autoFocus
                  type="search"
                  value={categorySearch}
                  onChange={(event) => setCategorySearch(event.target.value)}
                  placeholder="Search categories"
                  className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
              </label>
              <div role="listbox" aria-label="Course categories" className="mt-2 max-h-56 overflow-y-auto">
                {categoryOptions.length > 0 ? (
                  categoryOptions.map((category) => {
                    const selected = resolvedCategory === category;
                    return (
                      <button
                        key={category}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => selectCategory(category)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                          selected
                            ? "bg-blue-600 text-white"
                            : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                        }`}
                      >
                        {category}
                        {selected ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                      </button>
                    );
                  })
                ) : (
                  <p className="px-3 py-4 text-sm text-slate-500">No matching categories.</p>
                )}
              </div>
            </div>
          ) : null}
            </div>
          ) : null}
        </div>
      </div>
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
