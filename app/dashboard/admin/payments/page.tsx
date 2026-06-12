"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Input from "@/components/ui/Input";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { formatKsh } from "@/lib/utils/formatCurrency";
import { listPayments } from "@/services/paymentService";
import { planLabel } from "@/lib/payments/plans";
import { Payment } from "@/types/payment";

const STATUS_STYLES: Record<Payment["status"], string> = {
  success: "text-emerald-700",
  failed: "text-red-700",
  pending: "text-amber-700",
  cancelled: "text-slate-500",
};

export default function AdminPaymentsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { isAllowed, loading: roleGuardLoading } = useRoleGuard(["admin"]);
  const { pushToast } = useNotificationContext();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPayments(await listPayments());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load payments.";
      pushToast(message, "error");
      if (message.toLowerCase().includes("auth")) router.replace("/login");
    } finally {
      setLoading(false);
    }
  }, [pushToast, router]);

  useEffect(() => {
    if (!isAllowed || !profile) return;
    void load();
  }, [isAllowed, load, profile]);

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((payment) =>
      [
        payment.fullName,
        payment.email,
        payment.phone,
        payment.courseId,
        payment.courseTitle ?? "",
        payment.paystackReference,
        payment.status,
        payment.id,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [payments, search]);

  const totals = useMemo(() => {
    const success = payments.filter((p) => p.status === "success");
    const revenue = success.reduce((sum, p) => sum + p.amount, 0);
    return { count: success.length, revenue };
  }, [payments]);

  if (roleGuardLoading || !isAllowed) {
    return <section className="space-y-4"><p>Loading payments...</p></section>;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-slate-900">Payments</h2>
        <p className="rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
          {totals.count} paid · {formatKsh(totals.revenue)}
        </p>
      </div>
      <p className="text-sm text-slate-600">
        Live Paystack transactions. Access is granted automatically on successful payment — no
        manual approval needed.
      </p>
      <Input
        label="Search Payments"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by name, email, phone, course, reference, status..."
      />

      {loading ? <p>Loading payments...</p> : null}
      {!loading && filteredPayments.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-4 text-slate-600">No payments found.</p>
      ) : null}

      <div className="space-y-3">
        {filteredPayments.map((payment) => (
          <article key={payment.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="grid gap-2 md:grid-cols-2">
              <p className="text-sm text-slate-600"><span className="font-semibold text-slate-900">Student:</span> {payment.fullName}</p>
              <p className="text-sm text-slate-600"><span className="font-semibold text-slate-900">Email:</span> {payment.email}</p>
              <p className="text-sm text-slate-600"><span className="font-semibold text-slate-900">Phone:</span> {payment.phone}</p>
              <p className="text-sm text-slate-600"><span className="font-semibold text-slate-900">Amount:</span> {formatKsh(payment.amount)}</p>
              {payment.courseTitle ? (
                <p className="text-sm text-slate-600"><span className="font-semibold text-slate-900">Course:</span> {payment.courseTitle}</p>
              ) : null}
              <p className="text-sm text-slate-600"><span className="font-semibold text-slate-900">Plan:</span> {planLabel(payment.planType)} ({payment.lessonIds.length} lesson{payment.lessonIds.length === 1 ? "" : "s"})</p>
              <p className="text-sm text-slate-600"><span className="font-semibold text-slate-900">Reference:</span> <span className="font-mono text-xs">{payment.paystackReference}</span></p>
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">Status:</span>{" "}
                <span className={STATUS_STYLES[payment.status]}>{payment.status}</span>
              </p>
              <Link href={`/courses/${payment.courseId}`} className="text-sm font-semibold text-blue-700 hover:underline">
                Open course
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
