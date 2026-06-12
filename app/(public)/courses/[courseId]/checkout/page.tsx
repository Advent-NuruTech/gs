"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";

import CheckoutExperience from "@/components/course/CheckoutExperience";

export default function CourseCheckoutPage() {
  const params = useParams<{ courseId: string }>();
  return (
    <Suspense fallback={<main className="mx-auto max-w-4xl px-4 py-10 text-slate-600">Loading checkout…</main>}>
      <CheckoutExperience courseId={params.courseId} />
    </Suspense>
  );
}
