import {
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { teacherInviteDoc, teacherInvitesCollection } from "@/lib/firebase/firestore";
import { TeacherInvite } from "@/types/teacherInvite";

function mapInvite(id: string, data: Record<string, unknown>): TeacherInvite {
  return {
    id,
    email: String(data.email ?? ""),
    token: String(data.token ?? ""),
    invitedBy: String(data.invitedBy ?? ""),
    expiresAt: String(data.expiresAt ?? ""),
    used: Boolean(data.used),
    usedBy: data.usedBy ? String(data.usedBy) : undefined,
    usedAt: data.usedAt ? String(data.usedAt) : undefined,
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.().toISOString(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.().toISOString(),
  };
}

function createInviteToken(length = 48): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  for (let index = 0; index < length; index += 1) {
    token += chars[values[index] % chars.length];
  }
  return token;
}

export async function createTeacherInvite(input: {
  email: string;
  invitedBy: string;
  expiresInHours?: number;
}): Promise<TeacherInvite> {
  const token = createInviteToken();
  const expiresInHours = input.expiresInHours ?? 72;
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

  await setDoc(teacherInviteDoc(token), {
    email: input.email.toLowerCase().trim(),
    token,
    invitedBy: input.invitedBy,
    expiresAt,
    used: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    id: token,
    email: input.email.toLowerCase().trim(),
    token,
    invitedBy: input.invitedBy,
    expiresAt,
    used: false,
  };
}

export async function findTeacherInviteByToken(token: string): Promise<TeacherInvite | null> {
  const snapshot = await getDoc(teacherInviteDoc(token));
  if (!snapshot.exists()) return null;
  return mapInvite(snapshot.id, snapshot.data() as Record<string, unknown>);
}

export async function listTeacherInvitesByAdmin(adminId: string): Promise<TeacherInvite[]> {
  const snapshot = await getDocs(
    query(
      teacherInvitesCollection(),
      where("invitedBy", "==", adminId),
      orderBy("createdAt", "desc"),
      limit(30),
    ),
  );
  return snapshot.docs.map((docSnapshot) => mapInvite(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
}

export function isInviteExpired(invite: TeacherInvite): boolean {
  return new Date(invite.expiresAt).getTime() < Date.now();
}

export async function consumeTeacherInvite(inviteId: string, teacherId: string): Promise<void> {
  await updateDoc(teacherInviteDoc(inviteId), {
    used: true,
    usedBy: teacherId,
    usedAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });
}

export function buildTeacherInviteLink(token: string): string {
  if (typeof window === "undefined") return `/invite/teacher?token=${encodeURIComponent(token)}`;
  return `${window.location.origin}/invite/teacher?token=${encodeURIComponent(token)}`;
}
