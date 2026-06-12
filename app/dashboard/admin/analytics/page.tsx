"use client";

import { useEffect, useMemo, useState } from "react";

import { listCourses } from "@/services/courseService";
import { listAllEnrollments } from "@/services/enrollmentService";
import { listPayments } from "@/services/paymentService";
import { Course } from "@/types/course";
import { Enrollment } from "@/types/enrollment";
import { Payment } from "@/types/payment";

export default function AnalyticsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    async function load() {
      const [coursesResult, enrollmentData, paymentData] = await Promise.all([
        listCourses({ pageSize: 200 }),
        listAllEnrollments(),
        listPayments(),
      ]);
      setCourses(coursesResult.courses);
      setEnrollments(enrollmentData);
      setPayments(paymentData);
    }
    load();
  }, []);

  const avgProgress = useMemo(() => {
    if (!enrollments.length) return 0;
    const sum = enrollments.reduce((total, item) => total + item.progress, 0);
    return Math.round(sum / enrollments.length);
  }, [enrollments]);

  const pendingPayments = useMemo(
    () => payments.filter((payment) => payment.status === "pending").length,
    [payments],
  );

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Analytics</h2>
      <div className="grid gap-4 md:grid-cols-4">
        <article className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Courses</p>
          <p className="text-2xl font-bold text-slate-900">{courses.length}</p>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Enrollment Entries</p>
          <p className="text-2xl font-bold text-slate-900">{enrollments.length}</p>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Average Progress</p>
          <p className="text-2xl font-bold text-slate-900">{avgProgress}%</p>
        </article>
        <article className="rounded-md border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">Pending Payments</p>
          <p className="text-2xl font-bold text-amber-900">{pendingPayments}</p>
        </article>
      </div>
    </section>
  );
}
