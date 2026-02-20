import Link from "next/link";

import Button from "@/components/ui/Button";

export default function CheckoutSuccessPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-4 py-10">
      <section className="w-full space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-center sm:p-8">
        <p className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          Payment Submitted
        </p>
        <h1 className="text-2xl font-bold text-slate-900">Thanks for purchasing this course.</h1>
        <p className="text-slate-600">
          Your payment is now pending admin approval. You will be notified immediately when access is approved.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard/student/my-courses">
            <Button>Go To My Courses</Button>
          </Link>
          <Link href="/courses">
            <Button variant="secondary">Browse More Courses</Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
