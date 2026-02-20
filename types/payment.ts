export interface Payment {
  id: string;
  userId: string;
  courseId: string;
  courseTitle?: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  amount: number;
  paybillNumber: string;
  accountNumber: string;
  paymentGroupId?: string;
  specialNote?: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  reviewNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePaymentInput {
  userId: string;
  courseId: string;
  courseTitle?: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  amount: number;
  paybillNumber: string;
  accountNumber: string;
  paymentGroupId?: string;
  specialNote?: string;
}

export interface BatchPaymentCourse {
  courseId: string;
  courseTitle: string;
  amount: number;
}

export interface CreateBatchPaymentInput {
  userId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  paybillNumber: string;
  accountNumber: string;
  specialNote?: string;
  courses: BatchPaymentCourse[];
}
