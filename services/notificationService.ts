import { addDoc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";

import { notificationDoc, notificationsCollection } from "@/lib/firebase/firestore";
import { NotificationItem } from "@/types/notification";

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  read?: boolean;
  link?: string;
}

export async function createNotification(payload: NotificationPayload): Promise<string> {
  const ref = await addDoc(notificationsCollection(), {
    ...payload,
    read: payload.read ?? false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getNotificationsForUser(userId: string): Promise<NotificationItem[]> {
  const snapshot = await getDocs(
    query(
      notificationsCollection(),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
    ),
  );

  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data() as Record<string, unknown>;
    return {
      id: docSnapshot.id,
      userId: String(data.userId ?? ""),
      title: String(data.title ?? "Notice"),
      message: String(data.message ?? ""),
      read: Boolean(data.read),
      link: data.link ? String(data.link) : undefined,
      createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.().toISOString(),
    };
  });
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await updateDoc(notificationDoc(notificationId), {
    read: true,
  });
}
