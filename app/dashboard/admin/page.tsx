"use client";

import { useEffect, useState } from "react";

import UpcomingMeetingsWidget from "@/components/meetings/UpcomingMeetingsWidget";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface Metrics {
  admins: number;
  teachers: number;
  students: number;
  courses: number;
  enrollments: number;
  successfulPayments: number;
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<Metrics>({
    admins: 0,
    teachers: 0,
    students: 0,
    courses: 0,
    enrollments: 0,
    successfulPayments: 0,
  });

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseBrowserClient();
      const countOf = async (table: string, filter?: { column: string; value: string }) => {
        let q = supabase.from(table).select("id", { count: "exact", head: true });
        if (filter) q = q.eq(filter.column, filter.value);
        const { count } = await q;
        return count ?? 0;
      };

      const [admins, teachers, students, courses, enrollments, successfulPayments] =
        await Promise.all([
          countOf("profiles", { column: "role", value: "admin" }),
          countOf("profiles", { column: "role", value: "teacher" }),
          countOf("profiles", { column: "role", value: "student" }),
          countOf("courses"),
          countOf("enrollments"),
          countOf("payments", { column: "status", value: "success" }),
        ]);
      setMetrics({ admins, teachers, students, courses, enrollments, successfulPayments });
    }
    load();
  }, []);

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Admin Dashboard</h2>
      <UpcomingMeetingsWidget role="admin" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Students</p>
          <p className="text-2xl font-bold text-slate-900">{metrics.students}</p>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Teachers</p>
          <p className="text-2xl font-bold text-slate-900">{metrics.teachers}</p>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Admins</p>
          <p className="text-2xl font-bold text-slate-900">{metrics.admins}</p>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Courses</p>
          <p className="text-2xl font-bold text-slate-900">{metrics.courses}</p>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Enrollments</p>
          <p className="text-2xl font-bold text-slate-900">{metrics.enrollments}</p>
        </article>
        <article className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-800">Paid Transactions</p>
          <p className="text-2xl font-bold text-emerald-900">{metrics.successfulPayments}</p>
        </article>
      </div>
    </section>
  );
}
