import { LessonDraft } from "@/types/lesson";

export interface Course {
  id: string;
  title: string;
  originalPrice: number;
  discountedPrice: number;
  finalPrice: number;
  thumbnailUrl: string;
  outline: string;
  instructorId: string;
  published: boolean;
  lessonsCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCourseInput {
  title: string;
  originalPrice: number;
  discountedPrice: number;
  thumbnailUrl: string;
  outline: string;
  instructorId: string;
  published?: boolean;
  lessons?: LessonDraft[];
}

export interface CourseFilters {
  instructorId?: string;
  published?: boolean;
  pageSize?: number;
}
