"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import Button from "@/components/ui/Button";
import { useNotificationContext } from "@/context/NotificationContext";
import { deleteCourse, listCourses, updateCourse } from "@/services/courseService";
import { Course } from "@/types/course";

export default function AdminCoursesPage() {
  const { pushToast } = useNotificationContext();
  const [courses, setCourses] = useState<Course[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    const response = await listCourses({ pageSize: 200 });
    setCourses(response.courses);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const response = await listCourses({ pageSize: 200 });
      if (active) {
        setCourses(response.courses);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-slate-900">Courses</h2>
        <Link href="/dashboard/admin/courses/create">
          <Button>Create Course</Button>
        </Link>
      </div>
      <div className="space-y-3">
        {courses.map((course) => (
          <article key={course.id} className="rounded-md border border-slate-200 bg-white p-4">
            <div className="mb-3">
              <h3 className="font-semibold text-slate-900">{course.title}</h3>
              <p className="text-sm text-slate-600">Instructor: {course.instructorId}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  setSavingId(course.id);
                  try {
                    await updateCourse(course.id, { published: !course.published });
                    await load();
                  } finally {
                    setSavingId(null);
                  }
                }}
                disabled={savingId === course.id}
              >
                {savingId === course.id ? "Saving..." : course.published ? "Unpublish" : "Publish"}
              </Button>
              <Link href={`/dashboard/teacher/courses/${course.id}/edit`}>
                <Button type="button" variant="secondary">
                  Edit
                </Button>
              </Link>
              <Button
                type="button"
                variant="danger"
                onClick={async () => {
                  setDeletingId(course.id);
                  try {
                    await deleteCourse(course.id);
                    pushToast("Course deleted.", "success");
                    await load();
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
    </section>
  );
}
