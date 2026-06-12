export type PlanType = "full" | "per_lesson" | "installment" | "bundle";
export type PaymentStatus = "pending" | "success" | "failed" | "cancelled";

export interface Payment {
  id: string;
  userId: string;
  courseId: string;
  courseTitle?: string;
  planType: PlanType;
  lessonIds: string[];
  amount: number;
  currency: string;
  paystackReference: string;
  status: PaymentStatus;
  email: string;
  phone: string;
  fullName: string;
  paidAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** A selectable payment plan presented at checkout (derived from course price). */
export interface PaymentPlanOption {
  planType: PlanType;
  label: string;
  description: string;
  amount: number;
  lessonIds: string[];
}

export interface InitializePaymentInput {
  courseId: string;
  planType: PlanType;
  lessonIds: string[];
}
