"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Compass, Download, Flame, Layers3, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import CourseCard from "@/components/course/CourseCard";
import DesignCard from "@/components/design/DesignCard";
import { useAuth } from "@/hooks/useAuth";
import { useCourse } from "@/hooks/useCourse";
import { listDesigns } from "@/services/designService";
import { Design } from "@/types/design";
import { useEffect } from "react";

const TAKE = 12;

function SectionHeading({ eyebrow, title, href, label = "Explore all" }: { eyebrow: string; title: string; href: string; label?: string }) {
  return <div className="mb-5 flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700 dark:text-emerald-400">{eyebrow}</p><h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">{title}</h2></div><Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400">{label}<ArrowRight className="h-4 w-4" /></Link></div>;
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
  const profileHref = profile ? `/dashboard/${profile.role}` : "/login";

  return <main className="mx-auto max-w-7xl space-y-12 px-4 pb-8 pt-5 sm:px-6 sm:pt-8 lg:space-y-16">
    <section className="relative isolate overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-10 text-white shadow-2xl shadow-emerald-950/15 sm:px-10 sm:py-14 lg:px-14">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_80%_10%,rgba(16,185,129,.38),transparent_42%),radial-gradient(ellipse_at_5%_100%,rgba(59,130,246,.2),transparent_45%)]" />
      <div className="absolute -right-12 -top-24 -z-10 h-72 w-72 rounded-full border border-white/10 sm:right-12 sm:top-0 sm:h-96 sm:w-96" />
      <div className="max-w-3xl">
        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-emerald-200"><Sparkles className="h-4 w-4" /> Your next big idea starts here</p>
        <h1 className="mt-5 text-4xl font-black leading-[1.04] tracking-tight sm:text-6xl">Learn something.<br /><span className="bg-gradient-to-r from-emerald-300 to-cyan-200 bg-clip-text text-transparent">Make something.</span></h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">Discover practical courses and digital resources made to move your goals forward.</p>
        <div className="mt-7 flex flex-wrap gap-3"><Link href="/courses" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400"><BookOpen className="h-5 w-5" />Explore resources</Link><Link href="/designs" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 font-bold text-white transition hover:bg-white/10"><Layers3 className="h-5 w-5" />Shop digital products</Link></div>
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-slate-300"><span>✓ Learn at your pace</span><span>✓ Instant digital access</span><span>✓ Made for real progress</span></div>
      </div>
    </section>

    <section aria-label="Browse categories">
      <SectionHeading eyebrow="Find your next thing" title="Explore categories" href="/courses" label="Browse all" />
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
        {categories.map((category, index) => <button key={category} type="button" onClick={() => setActiveCategory(category)} className={`flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition sm:min-w-40 ${activeCategory === category ? "border-emerald-600 bg-emerald-700 text-white shadow-lg shadow-emerald-900/15" : "border-slate-200 bg-white text-slate-800 hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"}`}><span className={`grid h-10 w-10 place-items-center rounded-xl ${activeCategory === category ? "bg-white/15" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"}`}>{index === 0 ? <Compass className="h-5 w-5" /> : <Layers3 className="h-5 w-5" />}</span><span className="max-w-32 truncate text-sm font-bold">{category}</span></button>)}
      </div>
    </section>

    <section>
      <SectionHeading eyebrow="Fresh from the community" title="Just dropped" href="/designs" label="See all new" />
      {designsLoading ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}</div> : filteredDesigns.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">{filteredDesigns.slice(0, TAKE).map((design) => <DesignCard key={design.id} design={design} />)}</div> : <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">No resources in this category yet. Try another category.</p>}
    </section>

    {popularDesigns.length > 0 && <section><SectionHeading eyebrow="Loved by learners and creators" title="Popular right now" href="/designs" label="Shop all" /><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">{popularDesigns.slice(0, 4).map((design) => <div key={design.id} className="relative"><span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-amber-300 px-2.5 py-1 text-[11px] font-black text-amber-950"><Flame className="h-3.5 w-3.5" />POPULAR</span><DesignCard design={design} /></div>)}</div></section>}

    <section><SectionHeading eyebrow="Build skills that stick" title="Courses to move you forward" href="/courses" label="All courses" />{loading ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">{Array.from({ length: 3 }, (_, i) => <div key={i} className="h-72 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}</div> : newestCourses.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">{newestCourses.slice(0, 6).map((course) => <CourseCard key={course.id} course={course} />)}</div> : <div className="rounded-2xl bg-slate-50 p-8 text-center dark:bg-slate-900"><p className="font-semibold text-slate-800 dark:text-slate-100">New courses are on the way.</p><Link className="mt-2 inline-block text-sm font-bold text-emerald-700" href="/designs">Explore digital products <ArrowRight className="inline h-4 w-4" /></Link></div>}</section>

    <section className="flex flex-col gap-5 rounded-3xl bg-emerald-50 p-6 dark:bg-emerald-950/40 sm:flex-row sm:items-center sm:justify-between sm:p-8"><div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-700 text-white"><Download className="h-6 w-6" /></span><div><h2 className="text-xl font-black text-slate-950 dark:text-white">Your next step is one tap away.</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Pick up your courses and purchased resources from your personal library.</p></div></div><Link href={libraryHref} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800">Open my library <ArrowRight className="h-4 w-4" /></Link></section>
  </main>;
}
