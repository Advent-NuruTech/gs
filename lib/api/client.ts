interface ApiErrorPayload {
  error?: string;
}

/**
 * Browser-side fetch helper: parses JSON, throws the server's `error` message so
 * the UI can always show a real reason instead of a silent failure.
 */
export async function apiRequest<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as T | ApiErrorPayload | null;
  if (!response.ok) {
    const message = (payload as ApiErrorPayload | null)?.error;
    throw new Error(message ?? `Request failed (${response.status}). Please try again.`);
  }

  return payload as T;
}
