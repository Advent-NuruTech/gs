"use client";

import { useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface Metrics {
  users: number;
  courses: number;
  enrollments: number;
  successfulPayments: number;
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<Metrics>({
    users: 0,
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

      const [users, courses, enrollments, successfulPayments] = await Promise.all([
        countOf("profiles"),
        countOf("courses"),
        countOf("enrollments"),
        countOf("payments", { column: "status", value: "success" }),
      ]);
      setMetrics({ users, courses, enrollments, successfulPayments });
    }
    load();
  }, []);

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Admin Dashboard</h2>
      <div className="grid gap-4 md:grid-cols-4">
        <article className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Users</p>
          <p className="text-2xl font-bold text-slate-900">{metrics.users}</p>
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
