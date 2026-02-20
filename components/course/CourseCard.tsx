"use client";

import Image from "next/image";
import Link from "next/link";

import Button from "@/components/ui/Button";
import { useNotificationContext } from "@/context/NotificationContext";
import { useCart } from "@/hooks/useCart";
import { formatKsh } from "@/lib/utils/formatCurrency";
import { Course } from "@/types/course";

interface CourseCardProps {
  course: Course;
  enableCart?: boolean;
}

export default function CourseCard({ course, enableCart = true }: CourseCardProps) {
  const { addCourse, hasCourse } = useCart();
  const { pushToast } = useNotificationContext();

  const discountPercentage =
    course.originalPrice > 0
      ? Math.round(((course.originalPrice - course.finalPrice) / course.originalPrice) * 100)
      : 0;
  const inCart = hasCourse(course.id);

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="relative aspect-video w-full bg-slate-100">
        <Image
          src={course.thumbnailUrl}
          alt={course.title}
          fill
          className="object-contain"
          sizes="(max-width: 640px) 50vw, 25vw"
        />
        {discountPercentage > 0 ? (
          <span className="absolute left-2 top-2 rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white">
            {discountPercentage}% OFF
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col space-y-3 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 sm:text-base">{course.title}</h3>

        <div className="hidden items-center gap-1 text-xs text-amber-500 md:flex">
          <span>* 4.8</span>
          <span className="text-slate-500">(1,245 students)</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="font-bold text-slate-900">{formatKsh(course.finalPrice)}</span>
          {course.originalPrice > course.finalPrice ? (
            <span className="text-slate-400 line-through">{formatKsh(course.originalPrice)}</span>
          ) : null}
        </div>

        <div className="mt-auto grid gap-2 sm:grid-cols-2">
          <Link
            href={`/courses/${course.id}`}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-bold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg sm:text-base"
          >
            View Course
          </Link>
          {enableCart ? (
            <Button
              type="button"
              variant="secondary"
              disabled={inCart}
              className="w-full"
              onClick={() => {
                addCourse({
                  id: course.id,
                  title: course.title,
                  thumbnailUrl: course.thumbnailUrl,
                  finalPrice: course.finalPrice,
                });
                pushToast(inCart ? "Course already in cart." : "Course added to cart.", "success");
              }}
            >
              {inCart ? "In Cart" : "Add To Cart"}
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
