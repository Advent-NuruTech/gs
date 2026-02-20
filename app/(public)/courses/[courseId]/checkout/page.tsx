"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { useNotificationContext } from "@/context/NotificationContext";
import { useCart } from "@/hooks/useCart";
import { getCourseById } from "@/services/courseService";

export default function CourseCheckoutRedirectPage() {
  const params = useParams<{ courseId: string }>();
  const router = useRouter();
  const { pushToast } = useNotificationContext();
  const { addCourse, hasCourse } = useCart();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const course = await getCourseById(params.courseId);
        if (!active) return;
        if (!course) {
          pushToast("Course not found.", "error");
          router.replace("/courses");
          return;
        }
        if (!hasCourse(course.id)) {
          addCourse({
            id: course.id,
            title: course.title,
            thumbnailUrl: course.thumbnailUrl,
            finalPrice: course.finalPrice,
          });
        }
        router.replace("/checkout");
      } catch (error) {
        if (!active) return;
        pushToast(error instanceof Error ? error.message : "Unable to open checkout.", "error");
        router.replace(`/courses/${params.courseId}`);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [addCourse, hasCourse, params.courseId, pushToast, router]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      {loading ? "Preparing checkout..." : "Redirecting..."}
    </main>
  );
}
