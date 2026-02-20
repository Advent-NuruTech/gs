"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Course, CourseFilters } from "@/types/course";
import { getCourseById, listCourses } from "@/services/courseService";

export function useCourse(courseId?: string, filters: CourseFilters = {}) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  const normalizedFilters = useMemo(
    () => ({
      instructorId: filters.instructorId,
      published: filters.published,
      pageSize: filters.pageSize,
    }),
    [filters.instructorId, filters.pageSize, filters.published],
  );

  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listCourses(normalizedFilters);
      setCourses(response.courses);
    } finally {
      setLoading(false);
    }
  }, [normalizedFilters]);

  const loadCourse = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const item = await getCourseById(courseId);
      setCourse(item);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId) {
      loadCourse();
      return;
    }
    loadCourses();
  }, [courseId, loadCourse, loadCourses]);

  return {
    courses,
    course,
    loading,
    refresh: courseId ? loadCourse : loadCourses,
  };
}
