"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import PageSkeleton from "@/components/ui/PageSkeleton";
import StatusCard from "@/components/ui/StatusCard";
import StatCard from "@/components/ui/StatCard";
import UpcomingMeetingsWidget from "@/components/meetings/UpcomingMeetingsWidget";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface Metrics {
  admins: number;
  teachers: number;
  students: number;
  courses: number;
  designs: number;
  enrollments: number;
  successfulPayments: number;
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<Metrics>({
    admins: 0,
    teachers: 0,
    students: 0,
    courses: 0,
    designs: 0,
    enrollments: 0,
    successfulPayments: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseBrowserClient();
      const countOf = async (table: string, filter?: { column: string; value: string }) => {
        let q = supabase.from(table).select("id", { count: "exact", head: true });
        if (filter) q = q.eq(filter.column, filter.value);
        const { count, error } = await q;
        if (error) throw new Error(error.message);
        return count ?? 0;
      };

      try {
      const [admins, teachers, students, courses, designs, enrollments, successfulPayments] =
        await Promise.all([
          countOf("profiles", { column: "role", value: "admin" }),
          countOf("profiles", { column: "role", value: "teacher" }),
          countOf("profiles", { column: "role", value: "student" }),
          countOf("courses"),
          countOf("designs"),
          countOf("enrollments"),
          countOf("payments", { column: "status", value: "success" }),
        ]);
      setMetrics({ admins, teachers, students, courses, designs, enrollments, successfulPayments });
      } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load dashboard totals."); } finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <PageSkeleton label="Loading admin dashboard" variant="cards" />;

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Admin Dashboard</h2>
      <UpcomingMeetingsWidget role="admin" />
      {error ? <StatusCard kind="error" title="Could not load dashboard totals" description={error} /> : <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
        <Link href="/dashboard/admin/users"><StatCard label="Students" value={metrics.students} /></Link>
        <Link href="/dashboard/admin/users"><StatCard label="Creators" value={metrics.teachers} /></Link>
        <Link href="/dashboard/admin/users"><StatCard label="Admins" value={metrics.admins} /></Link>
        <StatCard label="Courses" value={metrics.courses} />
        <Link href="/dashboard/admin/designs"><StatCard label="Digital Products" value={metrics.designs} /></Link>
        <StatCard label="Enrollments" value={metrics.enrollments} />
        <StatCard label="Paid transactions" value={metrics.successfulPayments} tone="positive" />
      </div>}
    </section>
  );
}
