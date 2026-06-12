import { UserRole } from "@/types/user";

/** A chat thread between one student and one teacher. */
export interface Conversation {
  id: string;
  studentId: string;
  teacherId: string;
  lastMessage: string;
  lastMessageAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  readAt?: string;
  createdAt: string;
  /** Set on optimistic messages that have not yet been confirmed by the server. */
  pending?: boolean;
}

/** A person the current user is allowed to chat with, plus thread metadata. */
export interface ChatContact {
  userId: string;
  displayName: string;
  email: string;
  role: UserRole;
  photoURL?: string;
  conversationId?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}
