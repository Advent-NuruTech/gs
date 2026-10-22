"use client";

import Link from "next/link";
import { ArrowRight, Compass, Download, Flame, Layers3 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import CourseCard from "@/components/course/CourseCard";
import DesignCard from "@/components/design/DesignCard";
import HomeHero from "@/components/marketing/HomeHero";
import { useAuth } from "@/hooks/useAuth";
import { useCourse } from "@/hooks/useCourse";
import { listDesigns } from "@/services/designService";
import { Design } from "@/types/design";

const TAKE = 12;
function CategoryRail({ categories, activeCategory, onSelect }: { categories: string[]; activeCategory: string; onSelect: (category: string) => void }) {
  const railRef = useRef<HTMLDivElement>(null);
  const pauseUntilRef = useRef(0);
  const [loopEnabled, setLoopEnabled] = useState(false);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || categories.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.matchMedia("(min-width: 640px)").matches) return;
    setLoopEnabled(true);

    let frame = 0;
    let previous = 0;
    const pauseForInteraction = () => { pauseUntilRef.current = performance.now() + 30_000; };
    const animate = (now: number) => {
      const loopWidth = rail.scrollWidth / 2;
      if (loopWidth > rail.clientWidth) {
        if (rail.scrollLeft > loopWidth || rail.scrollLeft === 0 && previous === 0) rail.scrollLeft = loopWidth;
        const elapsed = previous ? Math.min(now - previous, 48) : 0;
        if (now >= pauseUntilRef.current) {
          rail.scrollLeft -= elapsed * 0.025;
          if (rail.scrollLeft <= 0) rail.scrollLeft = loopWidth;
        }
      }
      previous = now;
      frame = requestAnimationFrame(animate);
    };

    rail.addEventListener("pointerdown", pauseForInteraction);
    rail.addEventListener("touchstart", pauseForInteraction, { passive: true });
    rail.addEventListener("wheel", pauseForInteraction, { passive: true });
    rail.addEventListener("focusin", pauseForInteraction);
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      rail.removeEventListener("pointerdown", pauseForInteraction);
      rail.removeEventListener("touchstart", pauseForInteraction);
      rail.removeEventListener("wheel", pauseForInteraction);
      rail.removeEventListener("focusin", pauseForInteraction);
    };
  }, [categories]);

  const renderCategory = (category: string, index: number, duplicate = false) => (
    <button key={`${duplicate ? "copy-" : ""}${category}`} type="button" tabIndex={duplicate ? -1 : undefined} aria-hidden={duplicate || undefined} onClick={() => !duplicate && onSelect(category)} className={`flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition sm:min-w-40 ${duplicate ? "sm:hidden" : ""} ${activeCategory === category ? "border-blue-700 bg-blue-700 text-white shadow-lg shadow-blue-900/15" : "border-slate-200 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"}`}>
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${activeCategory === category ? "bg-white/15" : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"}`}>{index === 0 ? <Compass className="h-5 w-5" /> : <Layers3 className="h-5 w-5" />}</span>
      <span className="max-w-32 truncate text-sm font-bold">{category}</span>
    </button>
  );

  return <div ref={railRef} className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
    {categories.map((category, index) => renderCategory(category, index))}
    {categories.map((category, index) => loopEnabled ? renderCategory(category, index, true) : <span key={`copy-${category}`} className="hidden" aria-hidden="true" />)}
  </div>;
}

function SectionHeading({ eyebrow, title, href, label = "Explore all" }: { eyebrow: string; title: string; href: string; label?: string }) {
  return <div className="mb-5 flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-700 dark:text-blue-400">{eyebrow}</p><h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">{title}</h2></div><Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-blue-700 hover:text-blue-800 dark:text-blue-400">{label}<ArrowRight className="h-4 w-4" /></Link></div>;
}

export default function HomePage() {
  const { courses, loading } = useCourse(undefined, { published: true, pageSize: 100 });
  const { profile } = useAuth();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [designsLoading, setDesignsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    let active = true;
    void listDesigns({ published: true, pageSize: 100 }).then((data) => {
      if (active) setDesigns(data);
    }).catch(() => {
      if (active) setDesigns([]);
    }).finally(() => {
      if (active) setDesignsLoading(false);
    });
    return () => { active = false; };
  }, []);

  const categories = useMemo(() => ["All", ...Array.from(new Set([...designs.map((d) => d.category), ...courses.map((c) => c.category)].filter(Boolean))).slice(0, 8)], [courses, designs]);
  const newestDesigns = useMemo(() => [...designs].sort((a, b) => Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? "")), [designs]);
  const filteredDesigns = activeCategory === "All" ? newestDesigns : newestDesigns.filter((d) => d.category === activeCategory);
  const popularDesigns = useMemo(() => [...designs].sort((a, b) => (b.ordersCount * 3 + b.views) - (a.ordersCount * 3 + a.views)).slice(0, TAKE), [designs]);
  const newestCourses = useMemo(() => [...courses].sort((a, b) => Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? "")).slice(0, TAKE), [courses]);
  const libraryHref = profile ? (profile.role === "student" ? "/dashboard/student/my-courses" : `/dashboard/${profile.role}`) : "/login?redirect=%2Fdashboard%2Fstudent%2Fmy-courses";
  return <main className="mx-auto max-w-7xl space-y-12 px-2 pb-8 pt-3 sm:px-4 sm:pt-8 lg:space-y-16">
    <HomeHero />

    <section aria-label="Browse categories">
      <SectionHeading eyebrow="Find your next thing" title="Explore categories" href="/courses" label="Browse all" />
      <CategoryRail categories={categories} activeCategory={activeCategory} onSelect={setActiveCategory} />
    </section>

    <section>
      <SectionHeading eyebrow="Fresh from the community" title="Just dropped" href="/designs" label="See all new" />
      {designsLoading ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}</div> : filteredDesigns.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">{filteredDesigns.slice(0, TAKE).map((design) => <DesignCard key={design.id} design={design} />)}</div> : <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">No resources in this category yet. Try another category.</p>}
    </section>

    {popularDesigns.length > 0 && <section><SectionHeading eyebrow="Loved by learners and creators" title="Popular right now" href="/designs" label="Shop all" /><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">{popularDesigns.slice(0, 4).map((design) => <div key={design.id} className="relative"><span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-amber-300 px-2.5 py-1 text-[11px] font-black text-amber-950"><Flame className="h-3.5 w-3.5" />POPULAR</span><DesignCard design={design} /></div>)}</div></section>}

    <section><SectionHeading eyebrow="Build skills that stick" title="Courses to move you forward" href="/courses" label="All courses" />{loading ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">{Array.from({ length: 3 }, (_, i) => <div key={i} className="h-72 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}</div> : newestCourses.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">{newestCourses.slice(0, 6).map((course) => <CourseCard key={course.id} course={course} />)}</div> : <div className="rounded-2xl bg-slate-50 p-8 text-center dark:bg-slate-900"><p className="font-semibold text-slate-800 dark:text-slate-100">New courses are on the way.</p><Link className="mt-2 inline-block text-sm font-bold text-blue-700" href="/designs">Explore digital products <ArrowRight className="inline h-4 w-4" /></Link></div>}</section>

    <section className="flex flex-col gap-5 rounded-3xl bg-blue-50 p-6 dark:bg-blue-950/40 sm:flex-row sm:items-center sm:justify-between sm:p-8"><div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-700 text-white"><Download className="h-6 w-6" /></span><div><h2 className="text-xl font-black text-slate-950 dark:text-white">Your next step is one tap away.</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Pick up your courses and purchased resources from your personal library.</p></div></div><Link href={libraryHref} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-700 bg-white px-5 py-3 font-bold text-blue-700 transition hover:bg-blue-50 dark:border-blue-500 dark:bg-blue-700 dark:text-white dark:hover:bg-blue-600">Open my library <ArrowRight className="h-4 w-4" /></Link></section>
  </main>;
}
