"use client";

import { useMemo, useState } from "react";
import CatalogFilterBar from "@/components/catalog/CatalogFilterBar";
import CourseCard from "@/components/course/CourseCard";
import DesignCard from "@/components/design/DesignCard";
import Button from "@/components/ui/Button";
import PageSkeleton from "@/components/ui/PageSkeleton";
import StatusCard from "@/components/ui/StatusCard";
import { useAsyncData } from "@/hooks/useAsyncData";
import { listCourses } from "@/services/courseService";
import { listDesigns } from "@/services/designService";

export default function ResourcesPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const { data, isLoading, errorMessage, reload } = useAsyncData(async () => {
    const [courses, designs] = await Promise.all([
      listCourses({ published: true, pageSize: 300 }),
      listDesigns({ published: true, pageSize: 300 }),
    ]);
    return { courses: courses.courses, designs };
  }, []);

  const categories = useMemo(() => [...new Set([
    ...(data?.courses ?? []).map((item) => item.category || "General"),
    ...(data?.designs ?? []).map((item) => item.category || "General"),
  ])].sort((a, b) => a.localeCompare(b)), [data]);
  const activeCategory = category === "All" || categories.includes(category) ? category : "All";
  const query = search.trim().toLocaleLowerCase();
  const matches = (item: { title: string; category: string }) =>
    (activeCategory === "All" || (item.category || "General") === activeCategory) &&
    (!query || item.title.toLocaleLowerCase().includes(query) || (item.category || "General").toLocaleLowerCase().includes(query));
  const courses = (data?.courses ?? []).filter(matches);
  const designs = (data?.designs ?? []).filter(matches);

  return <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:py-10">
    <div className="space-y-2"><h1 className="text-3xl font-bold text-slate-900 dark:text-white">Resources</h1><p className="text-slate-600 dark:text-slate-300">Explore courses and digital products for learning, work and growth.</p></div>
    {isLoading ? <PageSkeleton label="Loading resources" variant="cards" /> : errorMessage ? <div className="space-y-3"><StatusCard kind="error" title="Could not load resources" description={errorMessage} /><Button onClick={reload}>Try again</Button></div> : <>
      <CatalogFilterBar query={search} onQueryChange={setSearch} searchPlaceholder="Search courses and products" searchLabel="Search courses and digital products" categories={categories} activeCategory={activeCategory} onCategoryChange={setCategory} resultCount={courses.length + designs.length} totalCount={(data?.courses.length ?? 0) + (data?.designs.length ?? 0)} itemLabel="resources" stickyOnMobile />
      {courses.length === 0 && designs.length === 0 ? <StatusCard kind="info" title="No resources found" description="Try another search or category." /> : null}
      {designs.length > 0 ? <section className="space-y-4"><h2 className="text-xl font-bold text-slate-900 dark:text-white">Digital products</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">{designs.map((design) => <DesignCard key={design.id} design={design} />)}</div></section> : null}
      {courses.length > 0 ? <section className="space-y-4"><h2 className="text-xl font-bold text-slate-900 dark:text-white">Courses</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">{courses.map((course) => <CourseCard key={course.id} course={course} />)}</div></section> : null}
    </>}
  </main>;
}
