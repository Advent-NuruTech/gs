"use client";

import {
  UserCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { auth, db } from "@/lib/firebase/config";
import { AppUser, CreateUserInput } from "@/types/user";
import {
  firebaseRequest,
  getFirebaseApiKey,
  getSession,
  setSession,
} from "@/lib/firebase/sdk/internal";

export async function registerUser(input: CreateUserInput): Promise<UserCredential> {
  const credential = await createUserWithEmailAndPassword(
    auth,
    input.email,
    input.password,
  );

  await updateProfile(credential.user, { displayName: input.displayName });

  await setDoc(doc(db, "users", credential.user.uid), {
    email: input.email,
    displayName: input.displayName,
    role: input.role ?? "student",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return credential;
}

interface AuthCreateResponse {
  localId: string;
  email: string;
  idToken: string;
}

export async function createUserAsAdmin(input: CreateUserInput): Promise<string> {
  const previousSession = getSession();
  const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${getFirebaseApiKey()}`;

  const response = await firebaseRequest<AuthCreateResponse>(endpoint, {
    method: "POST",
    body: {
      email: input.email,
      password: input.password,
      returnSecureToken: true,
    },
  });

  await setDoc(doc(db, "users", response.localId), {
    email: input.email,
    displayName: input.displayName,
    role: input.role ?? "student",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Preserve the admin session after creating another user account.
  setSession(previousSession ?? null);

  return response.localId;
}

export async function loginUser(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function getUserProfile(userId: string): Promise<AppUser | null> {
  const userDoc = await getDoc(doc(db, "users", userId));
  if (!userDoc.exists()) return null;

  const data = (userDoc.data() ?? {}) as Record<string, unknown>;
  const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
  const updatedAt = data.updatedAt as { toDate?: () => Date } | undefined;

  return {
    id: userDoc.id,
    email: String(data.email ?? ""),
    displayName: String(data.displayName ?? ""),
    role: (data.role as AppUser["role"]) ?? "student",
    photoURL: data.photoURL ? String(data.photoURL) : undefined,
    createdAt: createdAt?.toDate?.()?.toISOString(),
    updatedAt: updatedAt?.toDate?.()?.toISOString(),
  };
}
