"use client";

import Link from "next/link";
import { useState } from "react";

import { useNotificationContext } from "@/context/NotificationContext";
import { formatKsh } from "@/lib/utils/formatCurrency";
import { planLabel } from "@/lib/payments/plans";
import { cancelPayment } from "@/services/paymentService";
import { Payment } from "@/types/payment";

interface Props {
  /** Pending payment drafts belonging to the current user. */
  drafts: Payment[];
  /** Fallback course titles by id, when a draft has no stored title. */
  titlesById?: Record<string, string | undefined>;
  /** Called after a draft is cancelled so the parent can update its state. */
  onCancelled: (reference: string) => void;
}

export default function PaymentDrafts({ drafts, titlesById, onCancelled }: Props) {
  const { pushToast } = useNotificationContext();
  const [cancelling, setCancelling] = useState<string | null>(null);

  if (drafts.length === 0) return null;

  const handleCancel = async (payment: Payment) => {
    const title = payment.courseTitle || titlesById?.[payment.courseId] || "this course";
    if (!window.confirm(`Cancel your pending payment for ${title}?`)) return;

    setCancelling(payment.paystackReference);
    try {
      await cancelPayment(payment.paystackReference);
      onCancelled(payment.paystackReference);
      pushToast("Payment draft cancelled.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not cancel payment.", "error");
    } finally {
      setCancelling(null);
    }
  };

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold text-amber-900">Unfinished Payments</h3>
        <p className="text-sm text-amber-800">
          You started these but didn&apos;t finish. Complete the payment to unlock your lessons, or cancel the draft.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {drafts.map((payment) => {
          const title = payment.courseTitle || titlesById?.[payment.courseId] || "Pending Course";
          const isCancelling = cancelling === payment.paystackReference;
          return (
            <article
              key={payment.id || payment.paystackReference}
              className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4"
            >
              <div className="space-y-1">
                <h4 className="text-lg font-semibold text-slate-900 break-words">{title}</h4>
                <p className="text-sm text-amber-800">
                  {planLabel(payment.planType)} · {payment.lessonIds.length} lesson
                  {payment.lessonIds.length === 1 ? "" : "s"} · {formatKsh(payment.amount)}
                </p>
                <p className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  Draft — payment not completed
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/courses/${payment.courseId}/checkout`}
                  className="inline-flex rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                >
                  Finish Payment
                </Link>
                <button
                  type="button"
                  onClick={() => handleCancel(payment)}
                  disabled={isCancelling}
                  className="inline-flex rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
                >
                  {isCancelling ? "Cancelling…" : "Cancel"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
