import { QuizQuestion } from "@/types/quiz";

export interface Lesson {
  id: string;
  title: string;
  contentHTML: string;
  imageUrl?: string;
  videoUrl?: string;
  videoId?: string;
  order: number;
  quiz: QuizQuestion[];
  questions?: QuizQuestion[];
  createdAt?: string;
  updatedAt?: string;
}

export interface LessonDraft {
  id: string;
  title: string;
  contentHTML: string;
  imageUrl?: string;
  videoUrl?: string;
  quiz: QuizQuestion[];
  questions?: QuizQuestion[];
}

export interface CreateLessonInput {
  courseId: string;
  title: string;
  contentHTML: string;
  order: number;
  imageUrl?: string;
  videoUrl?: string;
  quiz?: QuizQuestion[];
  questions?: QuizQuestion[];
}

export interface UpdateLessonInput {
  title?: string;
  contentHTML?: string;
  order?: number;
  imageUrl?: string;
  videoUrl?: string;
  quiz?: QuizQuestion[];
  questions?: QuizQuestion[];
}
