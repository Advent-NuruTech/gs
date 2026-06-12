"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { formatKsh } from "@/lib/utils/formatCurrency";

export default function CartCheckoutPage() {
  const router = useRouter();
  const { profile, loading } = useAuth();
  const { items } = useCart();

  useEffect(() => {
    if (!loading && !profile) {
      router.replace(`/login?redirect=${encodeURIComponent("/checkout")}`);
    }
  }, [loading, profile, router]);

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div className="space-y-1">
        <Link href="/courses" className="text-sm text-blue-700 hover:underline">
          Back to courses
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Your Courses</h1>
        <p className="text-sm text-slate-600">
          Each course now has flexible payment plans (full, installments, per-lesson, or custom
          bundles). Pick a course to choose how you want to pay.
        </p>
      </div>

      {items.length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-slate-600">No courses selected yet.</p>
          <Link href="/courses" className="mt-3 inline-flex text-sm font-semibold text-blue-700 hover:underline">
            Browse courses
          </Link>
        </section>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="min-w-0">
                <h2 className="truncate font-semibold text-slate-900">{item.title}</h2>
                <p className="text-sm text-slate-500">From {formatKsh(item.finalPrice)}</p>
              </div>
              <Link href={`/courses/${item.id}/checkout`}>
                <Button>Choose Plan</Button>
              </Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
