import {
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { enrollUserInCourse } from "@/services/enrollmentService";
import { createNotification } from "@/services/notificationService";
import { paymentDoc, paymentsCollection, usersCollection } from "@/lib/firebase/firestore";
import { CreateBatchPaymentInput, CreatePaymentInput, Payment } from "@/types/payment";

function mapPayment(id: string, data: Record<string, unknown>): Payment {
  return {
    id,
    userId: String(data.userId ?? ""),
    courseId: String(data.courseId ?? ""),
    courseTitle: data.courseTitle ? String(data.courseTitle) : undefined,
    fullName: String(data.fullName ?? ""),
    email: String(data.email ?? ""),
    phoneNumber: String(data.phoneNumber ?? ""),
    amount: Number(data.amount ?? 0),
    paybillNumber: String(data.paybillNumber ?? ""),
    accountNumber: String(data.accountNumber ?? ""),
    paymentGroupId: data.paymentGroupId ? String(data.paymentGroupId) : undefined,
    specialNote: data.specialNote ? String(data.specialNote) : undefined,
    status: (data.status as Payment["status"]) ?? "pending",
    approvedBy: data.approvedBy ? String(data.approvedBy) : undefined,
    approvedAt: data.approvedAt ? String(data.approvedAt) : undefined,
    rejectedBy: data.rejectedBy ? String(data.rejectedBy) : undefined,
    rejectedAt: data.rejectedAt ? String(data.rejectedAt) : undefined,
    reviewNotes: data.reviewNotes ? String(data.reviewNotes) : undefined,
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.().toISOString(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.().toISOString(),
  };
}

function paymentIdFor(userId: string, courseId: string): string {
  return `${userId}_${courseId}`;
}

async function ensurePaymentCanBeCreated(id: string): Promise<void> {
  const existing = await getDoc(paymentDoc(id));
  if (existing.exists()) {
    const existingPayment = mapPayment(existing.id, existing.data() as Record<string, unknown>);
    if (existingPayment.status === "pending") {
      throw new Error("Your payment for this course is already pending approval.");
    }
    if (existingPayment.status === "approved") {
      throw new Error("This course payment has already been approved.");
    }
  }
}

async function notifyAdminsAboutPayment(message: string, link = "/dashboard/admin/payments"): Promise<void> {
  try {
    const adminSnapshots = await getDocs(query(usersCollection(), where("role", "==", "admin")));
    await Promise.all(
      adminSnapshots.docs.map((adminDoc) =>
        createNotification({
          userId: adminDoc.id,
          title: "New Course Payment",
          message,
          link,
        }),
      ),
    );
  } catch {
    // Payment submission should not fail if admin notification fails.
  }
}

async function createPaymentRecord(input: CreatePaymentInput, notifyAdmins = true): Promise<string> {
  const id = paymentIdFor(input.userId, input.courseId);
  await ensurePaymentCanBeCreated(id);

  await setDoc(paymentDoc(id), {
    ...input,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (notifyAdmins) {
    const courseLabel = input.courseTitle?.trim() || input.courseId;
    await notifyAdminsAboutPayment(
      `${input.fullName} submitted payment for ${courseLabel}.`,
      `/dashboard/admin/payments?courseId=${encodeURIComponent(input.courseId)}`,
    );
  }

  return id;
}

export async function createPayment(input: CreatePaymentInput): Promise<string> {
  return createPaymentRecord(input);
}

export async function createBatchPayment(input: CreateBatchPaymentInput): Promise<string[]> {
  if (!input.courses.length) {
    throw new Error("Add at least one course to checkout.");
  }

  const deduped = new Map<string, { courseTitle: string; amount: number }>();
  for (const course of input.courses) {
    if (!course.courseId) continue;
    deduped.set(course.courseId, {
      courseTitle: course.courseTitle,
      amount: course.amount,
    });
  }

  const paymentGroupId = `${input.userId}_${Date.now()}`;
  const createdPaymentIds: string[] = [];

  for (const [courseId, course] of deduped.entries()) {
    const paymentId = await createPaymentRecord(
      {
        userId: input.userId,
        courseId,
        courseTitle: course.courseTitle,
        fullName: input.fullName,
        email: input.email,
        phoneNumber: input.phoneNumber,
        amount: course.amount,
        paybillNumber: input.paybillNumber,
        accountNumber: input.accountNumber,
        paymentGroupId,
        specialNote: input.specialNote?.trim() || "",
      },
      false,
    );
    createdPaymentIds.push(paymentId);
  }

  const courseTitles = [...deduped.values()].map((item) => item.courseTitle).filter(Boolean);
  const summaryLabel = courseTitles.length ? courseTitles.join(", ") : `${deduped.size} course(s)`;

  await notifyAdminsAboutPayment(
    `${input.fullName} submitted payment for ${summaryLabel}.`,
    `/dashboard/admin/payments?groupId=${encodeURIComponent(paymentGroupId)}`,
  );

  return createdPaymentIds;
}

export async function getUserPaymentForCourse(
  userId: string,
  courseId: string,
): Promise<Payment | null> {
  const snapshot = await getDoc(paymentDoc(paymentIdFor(userId, courseId)));
  if (!snapshot.exists()) return null;
  return mapPayment(snapshot.id, snapshot.data() as Record<string, unknown>);
}

export async function listUserPayments(userId: string): Promise<Payment[]> {
  const snapshot = await getDocs(
    query(paymentsCollection(), where("userId", "==", userId), orderBy("createdAt", "desc")),
  );
  return snapshot.docs.map((docSnapshot) => mapPayment(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
}

export async function listPayments(status?: Payment["status"]): Promise<Payment[]> {
  const constraints = [orderBy("createdAt", "desc")];
  if (status) {
    constraints.unshift(where("status", "==", status));
  }
  const snapshot = await getDocs(query(paymentsCollection(), ...constraints));
  return snapshot.docs.map((docSnapshot) => mapPayment(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
}

export async function approvePayment(paymentId: string, adminId: string): Promise<void> {
  const snapshot = await getDoc(paymentDoc(paymentId));
  if (!snapshot.exists()) {
    throw new Error("Payment not found.");
  }

  const payment = mapPayment(snapshot.id, snapshot.data() as Record<string, unknown>);
  if (payment.status === "approved") return;

  await updateDoc(paymentDoc(paymentId), {
    status: "approved",
    approvedBy: adminId,
    approvedAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });

  await enrollUserInCourse(payment.userId, payment.courseId);
  await createNotification({
    userId: payment.userId,
    title: "Course Access Approved",
    message: "Your payment has been approved. You can now start learning.",
    link: `/dashboard/student/my-courses/${payment.courseId}`,
  });
}

export async function rejectPayment(
  paymentId: string,
  adminId: string,
  reviewNotes?: string,
): Promise<void> {
  const snapshot = await getDoc(paymentDoc(paymentId));
  if (!snapshot.exists()) {
    throw new Error("Payment not found.");
  }

  const payment = mapPayment(snapshot.id, snapshot.data() as Record<string, unknown>);

  await updateDoc(paymentDoc(paymentId), {
    status: "rejected",
    rejectedBy: adminId,
    rejectedAt: new Date().toISOString(),
    reviewNotes: reviewNotes ?? "",
    updatedAt: serverTimestamp(),
  });

  await createNotification({
    userId: payment.userId,
    title: "Course Payment Rejected",
    message: reviewNotes?.trim() || "Your payment could not be approved. Please contact support/admin.",
    link: `/courses/${payment.courseId}/checkout`,
  });
}
