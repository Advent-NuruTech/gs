"use client";

import Link from "next/link";

import UpcomingMeetingsWidget from "@/components/meetings/UpcomingMeetingsWidget";
import PageSkeleton from "@/components/ui/PageSkeleton";
import StatCard from "@/components/ui/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { useAsyncData } from "@/hooks/useAsyncData";
import { listCourses } from "@/services/courseService";
import { getTeacherStudentCount } from "@/services/messageService";
import { Course } from "@/types/course";
import { apiRequest } from "@/lib/api/client";
import StatusCard from "@/components/ui/StatusCard";
import { formatKsh } from "@/lib/utils/formatCurrency";

type PayoutSummaryResponse = {
  payout: unknown | null;
  earnings: Array<{ creator_amount: number | string }>;
};

type TeacherDashboardData = {
  courses: Course[];
  studentCount: number;
  needsPayout: boolean;
  totalEarnings: number;
};

export default function TeacherDashboardPage() {
  const { profile } = useAuth();
  const { data, isLoading, errorMessage, reload } = useAsyncData<TeacherDashboardData>(
    async () => {
      if (!profile) return { courses: [], studentCount: 0, needsPayout: false, totalEarnings: 0 };
      const [response, count, payout] = await Promise.all([
        listCourses({ instructorId: profile.id, pageSize: 50 }),
        getTeacherStudentCount(profile.id),
        apiRequest<PayoutSummaryResponse>("/api/creator/payout").catch(() => ({ payout: null, earnings: [] })),
      ]);
      return {
        courses: response.courses,
        studentCount: count,
        needsPayout: !payout.payout && response.courses.some((course) => course.published),
        totalEarnings: payout.earnings.reduce((total, earning) => total + Number(earning.creator_amount), 0),
      };
    },
    [profile?.id],
  );

  if (isLoading && !data) return <PageSkeleton label="Loading your teaching overview…" variant="cards" />;

  const courses = data?.courses ?? [];
  const studentCount = data?.studentCount ?? 0;
  const needsPayout = data?.needsPayout ?? false;

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Teacher Dashboard</h2>
      <p className="text-slate-600">Manage your courses and lessons at scale.</p>
      {errorMessage ? <StatusCard kind="error" title="Some overview details could not load" description={errorMessage} actions={<button type="button" onClick={reload} className="text-sm font-semibold underline">Try again</button>} /> : null}
      {needsPayout ? <Link href="/dashboard/teacher/payouts" className="block"><StatusCard kind="warning" title="Add your payout details" description="You have published a product but have not set up a payout account yet. Add payout details to receive your share of future sales." /></Link> : null}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <Link href="/dashboard/teacher/courses" className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" aria-label={`View ${courses.length} courses`}>
          <StatCard label="Total courses" value={courses.length} />
        </Link>
        <Link href="/dashboard/teacher/payouts" className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" aria-label={`View total earnings of ${formatKsh(data?.totalEarnings ?? 0)}`}>
          <StatCard label="Total earnings" value={formatKsh(data?.totalEarnings ?? 0)} hint="View payout and settlement details" />
        </Link>
        <div className="min-w-0">
          <StatCard label="My students" value={studentCount} />
        </div>
      </div>
      <UpcomingMeetingsWidget role="teacher" />
      <Link
        href="/dashboard/teacher/courses/create"
        className="inline-flex rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Create New Course
      </Link>
    </section>
  );
}
