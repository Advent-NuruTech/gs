import {
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  deleteDoc,
} from "firebase/firestore";

import { createUserAsAdmin } from "@/lib/firebase/auth";
import { userDoc, usersCollection } from "@/lib/firebase/firestore";
import { AppUser, CreateUserInput, UserRole } from "@/types/user";

function mapUser(id: string, data: Record<string, unknown>): AppUser {
  return {
    id,
    displayName: String(data.displayName ?? ""),
    email: String(data.email ?? ""),
    role: (data.role as UserRole) ?? "student",
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.().toISOString(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.().toISOString(),
  };
}

export async function listUsers(role?: UserRole): Promise<AppUser[]> {
  const constraints = [orderBy("createdAt", "desc")];
  if (role) {
    constraints.unshift(where("role", "==", role));
  }
  const snapshot = await getDocs(query(usersCollection(), ...constraints));
  return snapshot.docs.map((docSnapshot) => mapUser(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
}

export async function createManagedUser(input: CreateUserInput): Promise<string> {
  return createUserAsAdmin(input);
}

export async function updateManagedUser(
  userId: string,
  updates: Partial<Pick<AppUser, "displayName" | "role">>,
): Promise<void> {
  await updateDoc(userDoc(userId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteManagedUser(userId: string): Promise<void> {
  await deleteDoc(userDoc(userId));
}

