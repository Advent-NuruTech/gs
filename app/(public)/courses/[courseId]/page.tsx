"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import CartButton from "@/components/course/CartButton";
import Button from "@/components/ui/Button";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { formatKsh } from "@/lib/utils/formatCurrency";
import { formatContent } from "@/lib/utils/formatContent";
import { getEnrollmentByUserAndCourse } from "@/services/enrollmentService";
import { getUserPaymentForCourse } from "@/services/paymentService";
import { listCourseLessons } from "@/services/lessonService";
import { useCourse } from "@/hooks/useCourse";
import { Lesson } from "@/types/lesson";

export default function CoursePreviewPage() {
  const params = useParams<{ courseId: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const { pushToast } = useNotificationContext();
  const { addCourse, hasCourse } = useCart();
  const { course, loading } = useCourse(params.courseId);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const inCart = useMemo(() => (course ? hasCourse(course.id) : false), [course, hasCourse]);

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
      const redirectPath = encodeURIComponent(`/courses/${course.id}`);
      router.push(`/login?redirect=${redirectPath}`);
      return;
    }

    if (profile.role !== "student") {
      router.push(`/dashboard/${profile.role}`);
      return;
    }

    const [enrollment, payment] = await Promise.all([
      getEnrollmentByUserAndCourse(profile.id, course.id),
      getUserPaymentForCourse(profile.id, course.id),
    ]);

    if (enrollment) {
      const firstLessonId = enrollment.lastOpenedLessonId || enrollment.unlockedLessons?.[0];
      if (firstLessonId) {
        router.push(`/dashboard/student/my-courses/${course.id}/lesson/${firstLessonId}`);
      } else {
        router.push(`/dashboard/student/my-courses/${course.id}`);
      }
      return;
    }

    if (payment?.status === "pending") {
      router.push(`/dashboard/student/my-courses/${course.id}`);
      return;
    }

    addCourse({
      id: course.id,
      title: course.title,
      thumbnailUrl: course.thumbnailUrl,
      finalPrice: course.finalPrice,
    });
    pushToast(inCart ? "Course already in cart." : "Course added to cart.", "success");
    router.push("/checkout");
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
        <CartButton />
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
              {inCart ? "Go To Checkout" : "Add To Cart & Checkout"}
            </Button>
            {!inCart ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  addCourse({
                    id: course.id,
                    title: course.title,
                    thumbnailUrl: course.thumbnailUrl,
                    finalPrice: course.finalPrice,
                  });
                  pushToast("Course added to cart.", "success");
                }}
              >
                Add To Cart
              </Button>
            ) : null}
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
