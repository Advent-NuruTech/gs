import "server-only";

interface D1RestEnvelope<T> {
  success?: boolean;
  errors?: Array<{ message?: string }>;
  result?: Array<{ success?: boolean; results?: T[]; error?: string }>;
  results?: T[];
  error?: string;
}

export async function queryD1<T extends Record<string, unknown>>(
  sql: string,
  params: Array<string | number | null> = [],
): Promise<T[]> {
  const workerUrl = (process.env.CLOUDFLARE_STORAGE_WORKER_URL ?? "").replace(/\/$/, "");
  const sharedSecret = process.env.CLOUDFLARE_STORAGE_SHARED_SECRET ?? "";
  const stringParams = params.map((value) => value == null ? null : String(value));

  let endpoint = "";
  let token = "";
  if (workerUrl && sharedSecret) {
    endpoint = `${workerUrl}/internal/d1/query`;
    token = sharedSecret;
  } else {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
    const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID ?? "";
    token = process.env.CLOUDFLARE_API_TOKEN ?? "";
    if (!accountId || !databaseId || !token) {
      throw new Error("Cloudflare D1 is not configured.");
    }
    endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params: stringParams }),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as D1RestEnvelope<T> | null;
  if (!response.ok || !payload) {
    throw new Error(payload?.error ?? payload?.errors?.[0]?.message ?? "Cloudflare D1 request failed.");
  }

  if (workerUrl && sharedSecret) {
    if (!payload.success) throw new Error(payload.error ?? "Cloudflare D1 query failed.");
    return payload.results ?? [];
  }

  const first = payload.result?.[0];
  if (!payload.success || !first?.success) {
    throw new Error(first?.error ?? payload.errors?.[0]?.message ?? "Cloudflare D1 query failed.");
  }
  return first.results ?? [];
}
