"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import CartButton from "@/components/course/CartButton";
import CourseCard from "@/components/course/CourseCard";
import DesignCard from "@/components/design/DesignCard";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useCourse } from "@/hooks/useCourse";
import { listDesigns } from "@/services/designService";
import { listUserEnrollments } from "@/services/enrollmentService";
import { listUserPayments } from "@/services/paymentService";
import { Design } from "@/types/design";

/** Homepage shows at most this many featured courses and featured designs. */
const FEATURED_LIMIT = 6;

const PLATFORM_HIGHLIGHTS = [
  "Course upload with rich outlines and media.",
  "Progressive lesson unlock and quizzes.",
  "Admin analytics, user management, and notifications.",
  "Checkout and enrollment flow optimized for phones.",
];

export default function HomePage() {
  const { courses, loading } = useCourse(undefined, { published: true, pageSize: FEATURED_LIMIT });
  const { profile, loading: authLoading } = useAuth();
  const [featuredDesigns, setFeaturedDesigns] = useState<Design[]>([]);
  const [designsLoading, setDesignsLoading] = useState(true);
  const [hiddenCourseIds, setHiddenCourseIds] = useState<Set<string>>(new Set());
  const [typedHighlights, setTypedHighlights] = useState<string[]>(() =>
    PLATFORM_HIGHLIGHTS.map(() => ""),
  );

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

  // Load a handful of featured designs for the homepage gallery strip.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await listDesigns({ published: true, pageSize: FEATURED_LIMIT });
        if (active) setFeaturedDesigns(data.slice(0, FEATURED_LIMIT));
      } catch {
        if (active) setFeaturedDesigns([]);
      } finally {
        if (active) setDesignsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const visibleCourses = useMemo(
    () => courses.filter((course) => !hiddenCourseIds.has(course.id)).slice(0, FEATURED_LIMIT),
    [courses, hiddenCourseIds],
  );
  const activeTypingLineIndex = useMemo(
    () =>
      typedHighlights.findIndex(
        (line, index) => line.length < PLATFORM_HIGHLIGHTS[index].length,
      ),
    [typedHighlights],
  );
  const isStudent = profile?.role === "student";
  const shouldRenderFeaturedCourses = loading || visibleCourses.length > 0;

  useEffect(() => {
    let active = true;

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
      });

    const updateLine = (lineIndex: number, value: string) => {
      if (!active) return;
      setTypedHighlights((current) => {
        const next = [...current];
        next[lineIndex] = value;
        return next;
      });
    };

    const typeHighlights = async () => {
      while (active) {
        for (let lineIndex = 0; lineIndex < PLATFORM_HIGHLIGHTS.length; lineIndex += 1) {
          const targetLine = PLATFORM_HIGHLIGHTS[lineIndex];
          let composed = "";
          const mistakeIndex = Math.max(2, Math.floor(targetLine.length / 3));

          for (let charIndex = 0; charIndex < targetLine.length; charIndex += 1) {
            if (!active) return;

            const currentChar = targetLine[charIndex];
            if (charIndex === mistakeIndex && /[a-z]/i.test(currentChar)) {
              const wrongChar = currentChar.toLowerCase() === "e" ? "a" : "e";
              composed += wrongChar;
              updateLine(lineIndex, composed);
              await sleep(75);
              composed = composed.slice(0, -1);
              updateLine(lineIndex, composed);
              await sleep(65);
            }

            composed += currentChar;
            updateLine(lineIndex, composed);
            await sleep(22 + (charIndex % 4) * 14);
          }

          await sleep(200);
        }

        await sleep(900);
        setTypedHighlights(PLATFORM_HIGHLIGHTS.map(() => ""));
        await sleep(300);
      }
    };

    void typeHighlights();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:py-16">
      <div className="flex justify-end">
        <CartButton hideWhenEmpty />
      </div>
      <section className="grid gap-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 md:grid-cols-2 md:items-center">
        <div className="space-y-4">
          <p className="mx-auto inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            AdventSkool LMS
          </p>
          <h1 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
            Learn with a guided, mobile-first classroom experience.
          </h1>
          <p className="text-slate-600">
            Structured lessons, progress tracking, and role-based dashboards for students, teachers, and admins.
          </p>
          <div className="flex w-full items-center gap-3">
            <Link href="/courses">
              <Button>Browse Courses</Button>
            </Link>
            <Link href="/designs">
              <Button className="bg-indigo-600 text-white hover:bg-indigo-700">Design Gallery</Button>
            </Link>
            {!authLoading ? (
              isStudent ? (
                <Link href="/dashboard/student" className="ml-auto">
                  <Button variant="secondary">Profile</Button>
                </Link>
              ) : (
                <Link href="/register" className="ml-auto">
                  <Button>Create Student Account</Button>
                </Link>
              )
            ) : null}
          </div>
        </div>
        <div className="rounded-xl bg-slate-950 p-6 text-slate-100">
          <ul className="space-y-2 text-sm text-slate-300">
            {PLATFORM_HIGHLIGHTS.map((_, index) => (
              <li key={index} className="min-h-5">
                <span>{typedHighlights[index]}</span>
                {activeTypingLineIndex === index ? (
                  <span className="ml-0.5 inline-block animate-pulse text-blue-400">|</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-emerald-50 p-6 shadow-sm sm:p-8">
        <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Why New Learners Stay</p>
            <h2 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
              Start today, track real progress, finish with confidence.
            </h2>
            <p className="text-sm text-slate-700 sm:text-base">
              Bite-size lessons, clear milestones, and practical quizzes keep you moving from first login to course completion.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-white p-3 text-center text-sm font-semibold text-slate-800 sm:gap-3 sm:p-4 sm:text-base">
            <div>
              <p className="text-xl font-black text-blue-700 sm:text-2xl">24/7</p>
              <p className="text-xs text-slate-600 sm:text-sm">Access</p>
            </div>
            <div>
              <p className="text-xl font-black text-emerald-700 sm:text-2xl">Step</p>
              <p className="text-xs text-slate-600 sm:text-sm">By Step</p>
            </div>
            <div>
              <p className="text-xl font-black text-amber-700 sm:text-2xl">Mobile</p>
              <p className="text-xs text-slate-600 sm:text-sm">Ready</p>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-indigo-700 p-6 text-white shadow-sm sm:p-8">
        <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-200">Design Marketplace</p>
            <h2 className="text-2xl font-bold leading-tight sm:text-3xl">
              Thumbnails, posters, flyers &amp; banners — download instantly or get yours customized.
            </h2>
            <p className="max-w-2xl text-sm text-indigo-100 sm:text-base">
              Explore YouTube thumbnails, event &amp; church flyers, social media banners, conference posters,
              certificates and marketing graphics. Pay once to <span className="font-semibold text-white">download</span> in full
              quality, or pay a separate fee to <span className="font-semibold text-white">customize</span> it with your text,
              colors and photos.
            </p>
            <Link href="/designs" className="inline-block">
              <Button className="!bg-white !text-indigo-700 hover:!bg-indigo-50">Explore the Design Gallery</Button>
            </Link>
          </div>
        </div>
      </section>

      {designsLoading || featuredDesigns.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Featured Designs</h2>
            <Link href="/designs" className="text-sm font-semibold text-indigo-700 hover:underline">
              View all
            </Link>
          </div>
          {designsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
              ))}
            </div>
          ) : (
            <div className="columns-2 gap-4 lg:columns-3">
              {featuredDesigns.map((design) => (
                <DesignCard key={design.id} design={design} hidePrice />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {shouldRenderFeaturedCourses ? (
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
        </section>
      ) : null}
    </main>
  );
}
