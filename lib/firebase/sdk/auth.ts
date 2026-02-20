import { FirebaseApp } from "firebase/app";

import {
  FirebaseSession,
  firebaseRequest,
  getFirebaseApiKey,
  getSession,
  onSessionChanged,
  setSession,
} from "@/lib/firebase/sdk/internal";

export interface User {
  uid: string;
  email: string;
  displayName?: string;
}

export interface UserCredential {
  user: User;
}

export interface Auth {
  app: FirebaseApp;
}

let authInstance: Auth | null = null;

export function getAuth(app: FirebaseApp): Auth {
  if (!authInstance) {
    authInstance = { app };
  }
  return authInstance;
}

interface AuthResponse {
  localId: string;
  email: string;
  idToken: string;
  refreshToken?: string;
  displayName?: string;
}

function toUser(session: FirebaseSession): User {
  return {
    uid: session.uid,
    email: session.email,
    displayName: session.displayName,
  };
}

function authEndpoint(path: string): string {
  const apiKey = getFirebaseApiKey();
  return `https://identitytoolkit.googleapis.com/v1/${path}?key=${apiKey}`;
}

export async function createUserWithEmailAndPassword(
  auth: Auth,
  email: string,
  password: string,
): Promise<UserCredential> {
  void auth;
  const data = await firebaseRequest<AuthResponse>(authEndpoint("accounts:signUp"), {
    method: "POST",
    body: {
      email,
      password,
      returnSecureToken: true,
    },
  });

  const session: FirebaseSession = {
    uid: data.localId,
    email: data.email,
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    displayName: data.displayName,
  };
  setSession(session);
  return { user: toUser(session) };
}

export async function signInWithEmailAndPassword(
  auth: Auth,
  email: string,
  password: string,
): Promise<UserCredential> {
  void auth;
  const data = await firebaseRequest<AuthResponse>(
    authEndpoint("accounts:signInWithPassword"),
    {
      method: "POST",
      body: {
        email,
        password,
        returnSecureToken: true,
      },
    },
  );

  const session: FirebaseSession = {
    uid: data.localId,
    email: data.email,
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    displayName: data.displayName,
  };
  setSession(session);
  return { user: toUser(session) };
}

export async function signOut(auth: Auth): Promise<void> {
  void auth;
  setSession(null);
}

export async function updateProfile(
  user: User,
  data: { displayName?: string },
): Promise<void> {
  const apiKey = getFirebaseApiKey();
  const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`;
  const currentSession = getSession();

  if (!currentSession) return;

  const updated = await firebaseRequest<AuthResponse>(endpoint, {
    method: "POST",
    body: {
      idToken: currentSession.idToken,
      displayName: data.displayName ?? user.displayName ?? "",
      returnSecureToken: true,
    },
  });

  setSession({
    ...currentSession,
    idToken: updated.idToken ?? currentSession.idToken,
    refreshToken: updated.refreshToken ?? currentSession.refreshToken,
    displayName: data.displayName ?? currentSession.displayName,
  });
}

export function onAuthStateChanged(
  auth: Auth,
  callback: (user: User | null) => void,
) {
  void auth;
  return onSessionChanged((session) => callback(session ? toUser(session) : null));
}
