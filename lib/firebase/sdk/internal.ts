interface FirebaseSession {
  uid: string;
  email: string;
  displayName?: string;
  idToken: string;
  refreshToken?: string;
}

const SESSION_KEY = "adventskool.firebase.session";
const listeners = new Set<(session: FirebaseSession | null) => void>();

let memorySession: FirebaseSession | null = null;

function hasWindow() {
  return typeof window !== "undefined";
}

export function getFirebaseApiKey(): string {
  return process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
}

export function getFirebaseProjectId(): string {
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
}

export function getSession(): FirebaseSession | null {
  if (memorySession) return memorySession;
  if (!hasWindow()) return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    memorySession = JSON.parse(raw) as FirebaseSession;
    return memorySession;
  } catch {
    return null;
  }
}

export function setSession(session: FirebaseSession | null): void {
  memorySession = session;
  if (hasWindow()) {
    if (session) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(SESSION_KEY);
    }
  }
  for (const listener of listeners) {
    listener(session);
  }
}

export function onSessionChanged(listener: (session: FirebaseSession | null) => void) {
  listeners.add(listener);
  listener(getSession());
  return () => {
    listeners.delete(listener);
  };
}

export function getIdToken() {
  return getSession()?.idToken ?? "";
}

interface FirebaseRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

interface FirebaseErrorPayload {
  error?: { message?: string };
}

interface FirebaseRefreshTokenResponse {
  id_token?: string;
  refresh_token?: string;
}

function extractErrorMessage(payload: unknown): string {
  const data = payload as FirebaseErrorPayload;
  return data?.error?.message ?? "Firebase request failed.";
}

function isAuthFailure(statusCode: number, errorMessage: string): boolean {
  if (statusCode === 401 || statusCode === 403) return true;
  const lowered = errorMessage.toLowerCase();
  return (
    lowered.includes("missing or invalid authentication") ||
    lowered.includes("permission denied") ||
    lowered.includes("auth")
  );
}

async function refreshIdToken(): Promise<string> {
  const currentSession = getSession();
  const refreshToken = currentSession?.refreshToken;
  const apiKey = getFirebaseApiKey();

  if (!currentSession || !refreshToken || !apiKey) return "";

  const tokenEndpoint = `https://securetoken.googleapis.com/v1/token?key=${apiKey}`;
  const formBody = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody.toString(),
  });

  if (!response.ok) {
    return "";
  }

  const payload = (await response.json()) as FirebaseRefreshTokenResponse;
  const idToken = payload.id_token ?? "";
  if (!idToken) return "";

  setSession({
    ...currentSession,
    idToken,
    refreshToken: payload.refresh_token ?? refreshToken,
  });

  return idToken;
}

export async function firebaseRequest<T = unknown>(
  url: string,
  options: FirebaseRequestOptions = {},
): Promise<T> {
  const serializedBody = options.body ? JSON.stringify(options.body) : undefined;

  const executeRequest = async (idToken: string) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (options.auth && idToken) {
      headers.Authorization = `Bearer ${idToken}`;
    }

    return fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: serializedBody,
    });
  };

  let token = getIdToken();
  if (options.auth && !token) {
    token = await refreshIdToken();
  }

  let response = await executeRequest(token);
  let data = await response.json().catch(() => ({}));

  if (!response.ok && options.auth) {
    const message = extractErrorMessage(data);
    if (isAuthFailure(response.status, message)) {
      const refreshedToken = await refreshIdToken();
      if (refreshedToken && refreshedToken !== token) {
        response = await executeRequest(refreshedToken);
        data = await response.json().catch(() => ({}));
      }
    }
  }

  if (!response.ok) {
    throw new Error(extractErrorMessage(data));
  }

  return data as T;
}

export type { FirebaseSession };
