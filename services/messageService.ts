import type { RealtimeChannel } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ChatContact, ChatMessage, Conversation } from "@/types/message";
import { AppUser, UserRole } from "@/types/user";

const supabase = getSupabaseBrowserClient();

export function mapMessage(data: Record<string, unknown>): ChatMessage {
  return {
    id: String(data.id ?? ""),
    conversationId: String(data.conversation_id ?? ""),
    senderId: String(data.sender_id ?? ""),
    body: String(data.body ?? ""),
    readAt: data.read_at ? String(data.read_at) : undefined,
    createdAt: data.created_at ? String(data.created_at) : new Date().toISOString(),
  };
}

function mapConversation(data: Record<string, unknown>): Conversation {
  return {
    id: String(data.id ?? ""),
    studentId: String(data.student_id ?? ""),
    teacherId: String(data.teacher_id ?? ""),
    lastMessage: String(data.last_message ?? ""),
    lastMessageAt: data.last_message_at ? String(data.last_message_at) : undefined,
    createdAt: data.created_at ? String(data.created_at) : undefined,
    updatedAt: data.updated_at ? String(data.updated_at) : undefined,
  };
}

function mapContactProfile(data: Record<string, unknown>): AppUser {
  return {
    id: String(data.id ?? ""),
    email: String(data.email ?? ""),
    displayName: String(data.full_name ?? "") || String(data.email ?? "Member"),
    phone: String(data.phone ?? ""),
    role: (data.role as UserRole) ?? "student",
    photoURL: data.photo_url ? String(data.photo_url) : undefined,
  };
}

/**
 * Returns the conversation between a student and teacher, creating it on first
 * use. RLS enforces that the pair actually share a course.
 */
export async function getOrCreateConversation(
  studentId: string,
  teacherId: string,
): Promise<Conversation> {
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq("student_id", studentId)
    .eq("teacher_id", teacherId)
    .maybeSingle();
  if (existing) return mapConversation(existing);

  const { data, error } = await supabase
    .from("conversations")
    .insert({ student_id: studentId, teacher_id: teacherId })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not open conversation.");
  return mapConversation(data);
}

export async function listMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapMessage);
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not send message.");
  return mapMessage(data);
}

/** Marks every message in a conversation not sent by the user as read. */
export async function markConversationRead(
  conversationId: string,
  userId: string,
): Promise<void> {
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .is("read_at", null);
}

/**
 * Subscribes to new messages in a conversation. Returns the channel so the
 * caller can unsubscribe on cleanup.
 */
export function subscribeToConversation(
  conversationId: string,
  onMessage: (message: ChatMessage) => void,
): RealtimeChannel {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload: { new: Record<string, unknown> }) =>
        onMessage(mapMessage(payload.new)),
    )
    .subscribe();
  return channel;
}

async function buildContacts(
  partnerProfiles: AppUser[],
  conversationsByPartner: Map<string, Conversation>,
  unreadByConversation: Map<string, number>,
): Promise<ChatContact[]> {
  const contacts = partnerProfiles.map((person) => {
    const conversation = conversationsByPartner.get(person.id);
    return {
      userId: person.id,
      displayName: person.displayName,
      email: person.email,
      role: person.role,
      photoURL: person.photoURL,
      conversationId: conversation?.id,
      lastMessage: conversation?.lastMessage,
      lastMessageAt: conversation?.lastMessageAt,
      unreadCount: conversation ? unreadByConversation.get(conversation.id) ?? 0 : 0,
    } satisfies ChatContact;
  });

  // Active conversations first, most recent first; then untouched contacts.
  contacts.sort((a, b) => {
    if (a.lastMessageAt && b.lastMessageAt) {
      return b.lastMessageAt.localeCompare(a.lastMessageAt);
    }
    if (a.lastMessageAt) return -1;
    if (b.lastMessageAt) return 1;
    return a.displayName.localeCompare(b.displayName);
  });
  return contacts;
}

async function unreadCounts(
  conversationIds: string[],
  userId: string,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (conversationIds.length === 0) return counts;
  const { data } = await supabase
    .from("messages")
    .select("conversation_id")
    .in("conversation_id", conversationIds)
    .neq("sender_id", userId)
    .is("read_at", null);
  for (const row of data ?? []) {
    const id = String(row.conversation_id);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/** Teachers of the courses a student is enrolled in, plus thread metadata. */
export async function listStudentContacts(studentId: string): Promise<ChatContact[]> {
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("user_id", studentId);
  const courseIds = Array.from(
    new Set((enrollments ?? []).map((row: Record<string, unknown>) => String(row.course_id))),
  );
  if (courseIds.length === 0) return [];

  const { data: courses } = await supabase
    .from("courses")
    .select("instructor_id")
    .in("id", courseIds);
  const teacherIds = Array.from(
    new Set(
      (courses ?? [])
        .map((row: Record<string, unknown>) => String(row.instructor_id ?? ""))
        .filter(Boolean),
    ),
  );
  if (teacherIds.length === 0) return [];

  const [{ data: profiles }, { data: convs }] = await Promise.all([
    supabase.from("profiles").select("*").in("id", teacherIds),
    supabase.from("conversations").select("*").eq("student_id", studentId),
  ]);

  const conversations: Conversation[] = (convs ?? []).map(mapConversation);
  const byPartner = new Map<string, Conversation>(
    conversations.map((c) => [c.teacherId, c]),
  );
  const counts = await unreadCounts(conversations.map((c) => c.id), studentId);
  return buildContacts((profiles ?? []).map(mapContactProfile), byPartner, counts);
}

/** Students enrolled in a teacher's courses, plus thread metadata. */
export async function listTeacherContacts(teacherId: string): Promise<ChatContact[]> {
  const { data: courses } = await supabase
    .from("courses")
    .select("id")
    .eq("instructor_id", teacherId);
  const courseIds = (courses ?? []).map((row: Record<string, unknown>) => String(row.id));
  if (courseIds.length === 0) return [];

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("user_id")
    .in("course_id", courseIds);
  const studentIds = Array.from(
    new Set((enrollments ?? []).map((row: Record<string, unknown>) => String(row.user_id))),
  );
  if (studentIds.length === 0) return [];

  const [{ data: profiles }, { data: convs }] = await Promise.all([
    supabase.from("profiles").select("*").in("id", studentIds),
    supabase.from("conversations").select("*").eq("teacher_id", teacherId),
  ]);

  const conversations: Conversation[] = (convs ?? []).map(mapConversation);
  const byPartner = new Map<string, Conversation>(
    conversations.map((c) => [c.studentId, c]),
  );
  const counts = await unreadCounts(conversations.map((c) => c.id), teacherId);
  return buildContacts((profiles ?? []).map(mapContactProfile), byPartner, counts);
}

/** Distinct count of students enrolled in a teacher's courses. */
export async function getTeacherStudentCount(teacherId: string): Promise<number> {
  const { data: courses } = await supabase
    .from("courses")
    .select("id")
    .eq("instructor_id", teacherId);
  const courseIds = (courses ?? []).map((row: Record<string, unknown>) => String(row.id));
  if (courseIds.length === 0) return 0;

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("user_id")
    .in("course_id", courseIds);
  return new Set(
    (enrollments ?? []).map((row: Record<string, unknown>) => String(row.user_id)),
  ).size;
}
