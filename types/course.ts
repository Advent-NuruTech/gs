import { LessonDraft } from "@/types/lesson";

export interface Course {
  id: string;
  title: string;
  category: string;
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
  category?: string;
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
  category?: string;
  published?: boolean;
  pageSize?: number;
}
