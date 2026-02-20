"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { formatKsh } from "@/lib/utils/formatCurrency";
import { approvePayment, listPayments, rejectPayment } from "@/services/paymentService";
import { Payment } from "@/types/payment";

export default function AdminPaymentsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { isAllowed, loading: roleGuardLoading } = useRoleGuard(["admin"]);
  const { pushToast } = useNotificationContext();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listPayments();
      setPayments(rows);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load payments.";
      pushToast(message, "error");
      if (message.toLowerCase().includes("authentication")) {
        router.replace("/login");
      }
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
    return payments.filter((payment) => {
      return (
        payment.fullName.toLowerCase().includes(q) ||
        payment.email.toLowerCase().includes(q) ||
        payment.courseId.toLowerCase().includes(q) ||
        (payment.courseTitle ?? "").toLowerCase().includes(q) ||
        (payment.paymentGroupId ?? "").toLowerCase().includes(q) ||
        (payment.specialNote ?? "").toLowerCase().includes(q) ||
        payment.status.toLowerCase().includes(q) ||
        payment.id.toLowerCase().includes(q)
      );
    });
  }, [payments, search]);

  if (roleGuardLoading || !isAllowed) {
    return <section className="space-y-4"><p>Loading payments...</p></section>;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Course Payments</h2>
      <Input
        label="Search Payments"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by name, email, course title/id, payment id, status..."
      />
      {loading ? <p>Loading payments...</p> : null}

      {!loading && filteredPayments.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-4 text-slate-600">No payments found.</p>
      ) : null}

      <div className="space-y-3">
        {filteredPayments.map((payment) => (
          <article key={payment.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="grid gap-2 md:grid-cols-2">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">Student:</span> {payment.fullName}
              </p>
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">Email:</span> {payment.email}
              </p>
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">Course ID:</span> {payment.courseId}
              </p>
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">Amount:</span> {formatKsh(payment.amount)}
              </p>
              {payment.courseTitle ? (
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">Course:</span> {payment.courseTitle}
                </p>
              ) : null}
              {payment.specialNote ? (
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">Special Note:</span> {payment.specialNote}
                </p>
              ) : null}
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">Phone:</span> {payment.phoneNumber}
              </p>
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">Status:</span>{" "}
                <span className={payment.status === "approved" ? "text-emerald-700" : payment.status === "rejected" ? "text-red-700" : "text-amber-700"}>
                  {payment.status}
                </span>
              </p>
              <Link href={`/courses/${payment.courseId}`} className="text-sm font-semibold text-blue-700 hover:underline">
                Open course ordered
              </Link>
            </div>

            {payment.status === "pending" ? (
              <div className="mt-3 space-y-2">
                <Input
                  label="Rejection Note (Optional)"
                  value={rejectionNotes[payment.id] ?? ""}
                  onChange={(event) =>
                    setRejectionNotes((prev) => ({
                      ...prev,
                      [payment.id]: event.target.value,
                    }))
                  }
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={workingId === payment.id}
                    onClick={async () => {
                      if (!profile) return;
                      setWorkingId(payment.id);
                      try {
                        await approvePayment(payment.id, profile.id);
                        pushToast("Payment approved and course unlocked.", "success");
                        await load();
                      } catch (error) {
                        pushToast(error instanceof Error ? error.message : "Approval failed.", "error");
                      } finally {
                        setWorkingId(null);
                      }
                    }}
                  >
                    {workingId === payment.id ? "Approving..." : "Approve"}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    disabled={workingId === payment.id}
                    onClick={async () => {
                      if (!profile) return;
                      setWorkingId(payment.id);
                      try {
                        await rejectPayment(payment.id, profile.id, rejectionNotes[payment.id]);
                        pushToast("Payment rejected.", "success");
                        await load();
                      } catch (error) {
                        pushToast(error instanceof Error ? error.message : "Rejection failed.", "error");
                      } finally {
                        setWorkingId(null);
                      }
                    }}
                  >
                    {workingId === payment.id ? "Rejecting..." : "Reject"}
                  </Button>
                </div>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
