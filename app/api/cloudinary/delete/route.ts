import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

interface DeleteRequestBody {
  publicId?: string;
}

interface CloudinaryDestroyResponse {
  result?: string;
  error?: {
    message?: string;
  };
}

function signCloudinaryPayload(publicId: string, timestamp: number, apiSecret: string): string {
  const payload = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  return crypto.createHash("sha1").update(payload).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DeleteRequestBody;
    const publicId = body.publicId?.trim() ?? "";
    if (!publicId) {
      return NextResponse.json({ error: "Missing publicId." }, { status: 400 });
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
    const apiKey = process.env.CLOUDINARY_API_KEY ?? "";
    const apiSecret = process.env.CLOUDINARY_API_SECRET ?? "";

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Cloudinary delete credentials are not configured." },
        { status: 500 },
      );
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signCloudinaryPayload(publicId, timestamp, apiSecret);
    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`;

    const formData = new FormData();
    formData.append("public_id", publicId);
    formData.append("timestamp", String(timestamp));
    formData.append("api_key", apiKey);
    formData.append("signature", signature);
    formData.append("invalidate", "true");

    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => ({}))) as CloudinaryDestroyResponse;
    if (!response.ok) {
      return NextResponse.json(
        { error: payload.error?.message ?? "Cloudinary delete failed." },
        { status: response.status },
      );
    }

    if (payload.result !== "ok" && payload.result !== "not found") {
      return NextResponse.json(
        { error: "Cloudinary did not confirm deletion." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, result: payload.result ?? "ok" });
  } catch {
    return NextResponse.json({ error: "Invalid delete request." }, { status: 400 });
  }
}
