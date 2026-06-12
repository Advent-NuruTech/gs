"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import Button from "@/components/ui/Button";
import { formatKsh } from "@/lib/utils/formatCurrency";
import { verifyPayment } from "@/services/paymentService";

function SuccessContent() {
  const params = useParams<{ courseId: string }>();
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") || searchParams.get("trxref");

  const [state, setState] = useState<"verifying" | "success" | "failed">("verifying");
  const [amount, setAmount] = useState(0);
  const [unlocked, setUnlocked] = useState(0);

  useEffect(() => {
    let active = true;
    async function run() {
      if (!reference) {
        setState("failed");
        return;
      }
      try {
        const result = await verifyPayment(reference);
        if (!active) return;
        if (result.ok && result.status === "success") {
          setAmount(result.amount ?? 0);
          setUnlocked(result.unlockedLessonIds?.length ?? 0);
          setState("success");
        } else {
          setState("failed");
        }
      } catch {
        if (active) setState("failed");
      }
    }
    run();
    return () => {
      active = false;
    };
  }, [reference]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-4 py-10">
      <section className="w-full space-y-4 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {state === "verifying" && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-500" />
            <h1 className="text-xl font-bold text-slate-900">Verifying your payment…</h1>
            <p className="text-slate-600">This only takes a moment.</p>
          </>
        )}

        {state === "success" && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h1 className="text-2xl font-bold text-slate-900">Payment successful!</h1>
            <p className="text-slate-600">
              {formatKsh(amount)} received. {unlocked} lesson(s) unlocked. A receipt has been sent by SMS.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link href={`/dashboard/student/my-courses/${params.courseId}`}>
                <Button>Start Learning</Button>
              </Link>
              <Link href="/courses">
                <Button variant="secondary">Browse More</Button>
              </Link>
            </div>
          </>
        )}

        {state === "failed" && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="text-2xl font-bold text-slate-900">We could not confirm your payment</h1>
            <p className="text-slate-600">
              If you were charged, access unlocks automatically once Paystack confirms. You can retry checkout below.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link href={`/courses/${params.courseId}/checkout`}>
                <Button>Back to Checkout</Button>
              </Link>
              <Link href="/dashboard/student/my-courses">
                <Button variant="secondary">My Courses</Button>
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-2xl px-4 py-10 text-slate-600">Loading…</main>}>
      <SuccessContent />
    </Suspense>
  );
}
