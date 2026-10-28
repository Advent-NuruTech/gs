import "server-only";

import crypto from "crypto";

type R2Method = "GET" | "PUT" | "HEAD" | "DELETE";

function encodeKey(key: string): string {
  return key.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}

function hmac(key: Buffer | string, value: string): Buffer {
  return crypto.createHmac("sha256", key).update(value).digest();
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function r2Config() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
  const bucket = process.env.CLOUDFLARE_R2_BUCKET ?? "";
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ?? "";
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ?? "";
  if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("Cloudflare R2 is not configured.");
  }
  return { accountId, bucket, accessKeyId, secretAccessKey };
}

export function createR2PresignedUrl(input: {
  method: R2Method;
  key: string;
  expiresSeconds?: number;
  contentType?: string;
}): string {
  const { accountId, bucket, accessKeyId, secretAccessKey } = r2Config();
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const host = `${bucket}.${accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${encodeKey(input.key)}`;
  const signedHeaders = input.contentType ? "content-type;host" : "host";
  const query = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD",
    "X-Amz-Credential": `${accessKeyId}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(Math.min(604800, Math.max(1, input.expiresSeconds ?? 900))),
    "X-Amz-SignedHeaders": signedHeaders,
  });
  const canonicalQuery = [...query.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  const canonicalHeaders = input.contentType
    ? `content-type:${input.contentType.trim()}\nhost:${host}\n`
    : `host:${host}\n`;
  const canonicalRequest = [
    input.method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), "auto"), "s3"), "aws4_request");
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

export async function headR2Object(key: string) {
  const response = await fetch(createR2PresignedUrl({ method: "HEAD", key, expiresSeconds: 120 }), {
    method: "HEAD",
    cache: "no-store",
  });
  if (!response.ok) return null;
  return {
    size: Number(response.headers.get("content-length") ?? 0),
    etag: (response.headers.get("etag") ?? "").replace(/^\"|\"$/g, ""),
    contentType: response.headers.get("content-type") ?? "application/octet-stream",
  };
}

export async function deleteR2Object(key: string): Promise<void> {
  const response = await fetch(createR2PresignedUrl({ method: "DELETE", key, expiresSeconds: 120 }), {
    method: "DELETE",
    cache: "no-store",
  });
  if (!response.ok && response.status !== 404) throw new Error("Could not remove the R2 object.");
}
