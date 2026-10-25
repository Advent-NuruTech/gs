import "server-only";

import crypto from "node:crypto";

/** A high-entropy bearer token. Only its SHA-256 hash is retained in the database. */
export function createPublicPaymentToken() {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, hash: hashPublicPaymentToken(token) };
}

export function hashPublicPaymentToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function publicPaymentPath(token: string) {
  return `/adventpay/pay/${encodeURIComponent(token)}`;
}
