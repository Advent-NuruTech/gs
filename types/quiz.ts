export interface QuizQuestionOption {
  id: string;
  label: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizQuestionOption[];
  correctOptionId: string;
  explanation?: string;
}
