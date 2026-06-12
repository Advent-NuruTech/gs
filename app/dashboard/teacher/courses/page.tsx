"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import Button from "@/components/ui/Button";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import { deleteCourse, listCourses } from "@/services/courseService";
import { Course } from "@/types/course";

export default function TeacherCoursesPage() {
  const { profile } = useAuth();
  const { pushToast } = useNotificationContext();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      setLoading(true);
      try {
        const response = await listCourses({ instructorId: profile.id, pageSize: 100 });
        setCourses(response.courses);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [profile]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-slate-900">My Courses</h2>
        <Link
          href="/dashboard/teacher/courses/create"
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Create Course
        </Link>
      </div>
      {loading ? <p>Loading courses...</p> : null}
      {!loading && courses.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-4 text-slate-600">No courses created yet.</p>
      ) : null}
      {!loading && courses.length > 0 ? (
        <div className="space-y-3">
          {courses.map((course) => (
            <article key={course.id} className="rounded-md border border-slate-200 bg-white p-4">
              <h3 className="text-lg font-semibold text-slate-900">{course.title}</h3>
              <p className="text-sm text-slate-600">Lessons: {course.lessonsCount}</p>
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/dashboard/teacher/courses/${course.id}/edit`}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  Edit Course
                </Link>
                <Link
                  href={`/courses/${course.id}`}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  Preview
                </Link>
                <Button
                  type="button"
                  variant="danger"
                  onClick={async () => {
                    setDeletingId(course.id);
                    try {
                      await deleteCourse(course.id);
                      setCourses((prev) => prev.filter((item) => item.id !== course.id));
                      pushToast("Course deleted.", "success");
                    } catch (error) {
                      pushToast(error instanceof Error ? error.message : "Failed to delete course.", "error");
                    } finally {
                      setDeletingId(null);
                    }
                  }}
                  disabled={deletingId === course.id}
                >
                  {deletingId === course.id ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
