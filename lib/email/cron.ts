import "server-only";

import { NextRequest } from "next/server";

/**
 * Cron routes are called by Supabase pg_cron (via pg_net) which sets the
 * `x-cron-secret` header. A bearer token is also accepted for manual testing.
 * Returns false when CRON_SECRET is unset so the routes fail closed.
 */
export function isAuthorizedCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) return false;
  const header =
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  return header === secret;
}

/** e.g. "2026-06-H1" (1st–14th) / "2026-06-H2" (15th+) — one promo window. */
export function currentPromoPeriod(d = new Date()): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const half = d.getUTCDate() < 15 ? "H1" : "H2";
  return `${year}-${month}-${half}`;
}
