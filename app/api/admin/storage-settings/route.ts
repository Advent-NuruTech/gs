import { NextRequest, NextResponse } from "next/server";

import { DEFAULT_MAX_UPLOAD_BYTES } from "@/lib/cloudflare/assets";
import { queryD1 } from "@/lib/cloudflare/d1";
import { getRequestUser } from "@/lib/api/requireUser";

export const runtime = "nodejs";

async function requireAdmin(request: NextRequest) {
  const user = await getRequestUser(request);
  return user?.role === "admin" ? user : null;
}

export async function GET(request: NextRequest) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  try {
    const [settings, overrides] = await Promise.all([
      queryD1<Record<string, unknown>>("SELECT default_max_upload_bytes FROM storage_settings WHERE id = 1 LIMIT 1"),
      queryD1<Record<string, unknown>>("SELECT account_id, max_upload_bytes, unlimited, updated_at FROM account_storage_limits ORDER BY updated_at DESC"),
    ]);
    return NextResponse.json({
      defaultMaxUploadBytes: Number(settings[0]?.default_max_upload_bytes ?? DEFAULT_MAX_UPLOAD_BYTES),
      overrides: overrides.map((row) => ({
        accountId: String(row.account_id),
        maxUploadBytes: row.max_upload_bytes == null ? null : Number(row.max_upload_bytes),
        unlimited: Number(row.unlimited ?? 0) === 1,
        updatedAt: String(row.updated_at ?? ""),
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load storage settings." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const scope = String(body?.scope ?? "");
  try {
    if (scope === "global") {
      const maxMb = Number(body?.maxUploadMb);
      const bytes = Math.round(maxMb * 1024 * 1024);
      if (!Number.isFinite(maxMb) || maxMb <= 0 || !Number.isSafeInteger(bytes)) {
        return NextResponse.json({ error: "Enter a valid positive upload size." }, { status: 400 });
      }
      await queryD1(
        "UPDATE storage_settings SET default_max_upload_bytes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
        [bytes],
      );
      return NextResponse.json({ ok: true });
    }

    if (scope === "account") {
      const accountId = String(body?.accountId ?? "");
      const mode = String(body?.mode ?? "");
      if (!accountId || !["inherit", "custom", "unlimited"].includes(mode)) {
        return NextResponse.json({ error: "Invalid account upload setting." }, { status: 400 });
      }
      if (mode === "inherit") {
        await queryD1("DELETE FROM account_storage_limits WHERE account_id = ?", [accountId]);
        return NextResponse.json({ ok: true });
      }
      let bytes: number | null = null;
      if (mode === "custom") {
        const maxMb = Number(body?.maxUploadMb);
        bytes = Math.round(maxMb * 1024 * 1024);
        if (!Number.isFinite(maxMb) || maxMb <= 0 || !Number.isSafeInteger(bytes)) {
          return NextResponse.json({ error: "Enter a valid positive upload size." }, { status: 400 });
        }
      }
      await queryD1(
        `INSERT INTO account_storage_limits (account_id, max_upload_bytes, unlimited, updated_by, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(account_id) DO UPDATE SET
           max_upload_bytes = excluded.max_upload_bytes,
           unlimited = excluded.unlimited,
           updated_by = excluded.updated_by,
           updated_at = CURRENT_TIMESTAMP`,
        [accountId, bytes, mode === "unlimited" ? 1 : 0, admin.id],
      );
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Invalid storage setting." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save storage settings." }, { status: 500 });
  }
}
