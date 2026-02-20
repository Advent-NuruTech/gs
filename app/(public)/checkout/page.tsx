"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CartButton from "@/components/course/CartButton";
import PaymentDetails from "@/components/course/PaymentDetails";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { listUserEnrollments } from "@/services/enrollmentService";
import { createBatchPayment, listUserPayments } from "@/services/paymentService";

const PAYBILL_NUMBER = "522522";
const ACCOUNT_NUMBER = "1330640322";

export default function CheckoutPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const { pushToast } = useNotificationContext();
  const { items, clearCart, removeCourse } = useCart();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [specialNote, setSpecialNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [blockedCourseIds, setBlockedCourseIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!profile) return;
    setPhoneNumber((current) => current || "+254");
  }, [profile]);

  useEffect(() => {
    if (authLoading || profile) return;
    const redirectPath = encodeURIComponent("/checkout");
    router.replace(`/login?redirect=${redirectPath}`);
  }, [authLoading, profile, router]);

  useEffect(() => {
    if (!profile || profile.role !== "student") return;
    let active = true;
    (async () => {
      try {
        const [enrollments, payments] = await Promise.all([
          listUserEnrollments(profile.id),
          listUserPayments(profile.id),
        ]);
        const blocked = new Set<string>();
        for (const enrollment of enrollments) {
          blocked.add(enrollment.courseId);
        }
        for (const payment of payments) {
          if (payment.status === "pending" || payment.status === "approved") {
            blocked.add(payment.courseId);
          }
        }
        if (!active) return;
        setBlockedCourseIds(blocked);
        for (const item of items) {
          if (blocked.has(item.id)) {
            removeCourse(item.id);
          }
        }
      } catch (error) {
        if (!active) return;
        pushToast(error instanceof Error ? error.message : "Failed to validate checkout items.", "error");
      }
    })();

    return () => {
      active = false;
    };
  }, [items, profile, pushToast, removeCourse]);

  const coursesToPay = useMemo(
    () => items.filter((item) => !blockedCourseIds.has(item.id)),
    [blockedCourseIds, items],
  );
  const validPhoneNumber = useMemo(() => /^\+\d{7,15}$/.test(phoneNumber.trim()), [phoneNumber]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile || profile.role !== "student") return;
    if (!coursesToPay.length) {
      pushToast("Your cart is empty.", "error");
      return;
    }
    if (!validPhoneNumber) {
      pushToast("Enter phone number as country code format (example: +254700000000).", "error");
      return;
    }

    setSubmitting(true);
    try {
      await createBatchPayment({
        userId: profile.id,
        fullName: profile.displayName,
        email: profile.email,
        phoneNumber: phoneNumber.trim(),
        paybillNumber: PAYBILL_NUMBER,
        accountNumber: ACCOUNT_NUMBER,
        specialNote: specialNote.trim(),
        courses: coursesToPay.map((course) => ({
          courseId: course.id,
          courseTitle: course.title,
          amount: course.finalPrice,
        })),
      });
      clearCart();
      router.push("/checkout/success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Payment submission failed.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return <main className="mx-auto max-w-5xl px-4 py-10">Loading checkout...</main>;
  }

  if (profile && profile.role !== "student") {
    return (
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-10">
        <p className="rounded-md border border-slate-200 bg-white p-5 text-slate-700">
          Checkout is available for student accounts only.
        </p>
        <Link href={`/dashboard/${profile.role}`} className="text-sm font-semibold text-blue-700 hover:underline">
          Go to dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Link href="/courses" className="text-sm text-blue-700 hover:underline">
            Back to courses
          </Link>
          <p className="text-sm text-slate-600">Review your cart and submit one payment for all selected courses.</p>
        </div>
        <CartButton />
      </div>

      {coursesToPay.length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h1 className="text-xl font-semibold text-slate-900">Your cart is empty</h1>
          <p className="mt-2 text-slate-600">
            Add one or more courses, then complete payment once.
          </p>
          <Link href="/courses" className="mt-4 inline-flex text-sm font-semibold text-blue-700 hover:underline">
            Browse courses
          </Link>
        </section>
      ) : (
        <PaymentDetails
          courses={coursesToPay.map((course) => ({
            id: course.id,
            title: course.title,
            amount: course.finalPrice,
          }))}
          fullName={profile?.displayName ?? ""}
          email={profile?.email ?? ""}
          phoneNumber={phoneNumber}
          specialNote={specialNote}
          paybillNumber={PAYBILL_NUMBER}
          accountNumber={ACCOUNT_NUMBER}
          submitting={submitting}
          validPhoneNumber={validPhoneNumber}
          onPhoneNumberChange={setPhoneNumber}
          onSpecialNoteChange={setSpecialNote}
          onSubmit={handleSubmit}
        />
      )}
    </main>
  );
}
