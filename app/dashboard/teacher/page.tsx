"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { listCourses } from "@/services/courseService";
import { Course } from "@/types/course";

export default function TeacherDashboardPage() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      const response = await listCourses({ instructorId: profile.id, pageSize: 50 });
      setCourses(response.courses);
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
      </div>
      <Link
        href="/dashboard/teacher/courses/create"
        className="inline-flex rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
      >
        Create New Course
      </Link>
    </section>
  );
}
