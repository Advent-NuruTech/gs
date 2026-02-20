"use client";

import { useCallback, useEffect, useState } from "react";

import { Enrollment } from "@/types/enrollment";
import {
  getEnrollmentByUserAndCourse,
  updateEnrollmentProgress,
} from "@/services/enrollmentService";

export function useLessonProgress(userId?: string, courseId?: string) {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId || !courseId) return;
    setLoading(true);
    try {
      const data = await getEnrollmentByUserAndCourse(userId, courseId);
      setEnrollment(data);
    } finally {
      setLoading(false);
    }
  }, [courseId, userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const recalculateProgress = useCallback(async () => {
    if (!enrollment || !courseId) return;
    await updateEnrollmentProgress(enrollment.id, courseId);
    await refresh();
  }, [courseId, enrollment, refresh]);

  return { enrollment, loading, refresh, recalculateProgress };
}
