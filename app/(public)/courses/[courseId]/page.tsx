"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { formatKsh } from "@/lib/utils/formatCurrency";
import { formatContent } from "@/lib/utils/formatContent";
import { getEnrollmentByUserAndCourse } from "@/services/enrollmentService";
import { listCourseLessons } from "@/services/lessonService";
import { useCourse } from "@/hooks/useCourse";
import { Lesson } from "@/types/lesson";

export default function CoursePreviewPage() {
  const params = useParams<{ courseId: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const { course, loading } = useCourse(params.courseId);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  useEffect(() => {
    async function loadLessons() {
      if (!params.courseId) return;
      const data = await listCourseLessons(params.courseId);
      setLessons(data);
    }
    loadLessons();
  }, [params.courseId]);

  const handleEnroll = async () => {
    if (!course) return;

    if (!profile) {
      const redirectPath = encodeURIComponent(`/courses/${course.id}/checkout`);
      router.push(`/login?redirect=${redirectPath}`);
      return;
    }

    if (profile.role !== "student") {
      router.push(`/dashboard/${profile.role}`);
      return;
    }

    const enrollment = await getEnrollmentByUserAndCourse(profile.id, course.id);

    // Already has some access -> open the course; otherwise go choose a plan.
    if (enrollment && (enrollment.unlockedLessons?.length ?? 0) > 0) {
      const firstLessonId = enrollment.lastOpenedLessonId || enrollment.unlockedLessons?.[0];
      router.push(
        firstLessonId
          ? `/dashboard/student/my-courses/${course.id}/lesson/${firstLessonId}`
          : `/dashboard/student/my-courses/${course.id}`,
      );
      return;
    }

    router.push(`/courses/${course.id}/checkout`);
  };

  if (loading) {
    return <main className="mx-auto max-w-5xl px-4 py-10">Loading course...</main>;
  }

  if (!course) {
    return <main className="mx-auto max-w-5xl px-4 py-10">Course not found.</main>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/courses" className="text-sm text-blue-700 hover:underline">
          Back to courses
        </Link>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <Image
          src={course.thumbnailUrl}
          alt={course.title}
          width={1280}
          height={512}
          className="h-72 w-full object-cover"
        />
        <div className="space-y-4 p-6">
          <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
            {course.category}
          </span>
          <h1 className="text-3xl font-bold text-slate-900">{course.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-400 line-through">{formatKsh(course.originalPrice)}</span>
            <span className="rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">
              Discount {formatKsh(course.discountedPrice)}
            </span>
            <span className="font-semibold text-slate-900">Pay {formatKsh(course.finalPrice)}</span>
          </div>
          <div
            className="prose-content text-slate-700"
            dangerouslySetInnerHTML={{ __html: formatContent(course.outline) }}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleEnroll}>
              Choose Payment Plan
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-3 text-xl font-semibold text-slate-900">Lesson Outline</h2>
        <ol className="space-y-2">
          {lessons.map((lesson) => (
            <li key={lesson.id} className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {lesson.order}. {lesson.title}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
