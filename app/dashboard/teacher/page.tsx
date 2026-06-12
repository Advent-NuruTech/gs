"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import UpcomingMeetingsWidget from "@/components/meetings/UpcomingMeetingsWidget";
import { useAuth } from "@/hooks/useAuth";
import { listCourses } from "@/services/courseService";
import { getTeacherStudentCount } from "@/services/messageService";
import { Course } from "@/types/course";

export default function TeacherDashboardPage() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [studentCount, setStudentCount] = useState(0);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      const [response, count] = await Promise.all([
        listCourses({ instructorId: profile.id, pageSize: 50 }),
        getTeacherStudentCount(profile.id),
      ]);
      setCourses(response.courses);
      setStudentCount(count);
    }
    load();
  }, [profile]);

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Teacher Dashboard</h2>
      <p className="text-slate-600">Manage your courses and lessons at scale.</p>
      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Total Courses</p>
          <p className="text-2xl font-bold text-slate-900">{courses.length}</p>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">My Students</p>
          <p className="text-2xl font-bold text-slate-900">{studentCount}</p>
        </article>
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
