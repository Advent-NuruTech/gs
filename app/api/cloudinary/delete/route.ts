import { NextRequest, NextResponse } from "next/server";
import { destroyCloudinaryAssetByUrl } from "@/lib/cloudinary/destroyServer";
import { getRequestUser } from "@/lib/api/requireUser";

interface DeleteRequestBody {
  publicId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user || (user.role !== "admin" && user.role !== "teacher")) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }
    const body = (await request.json()) as DeleteRequestBody;
    const publicId = body.publicId?.trim() ?? "";
    if (!publicId) {
      return NextResponse.json({ error: "Missing publicId." }, { status: 400 });
    }
    if (!publicId.startsWith("adventskool/")) {
      return NextResponse.json({ error: "Invalid Cloudinary asset." }, { status: 400 });
    }

    await destroyCloudinaryAssetByUrl(`https://res.cloudinary.com/placeholder/image/upload/${publicId}`);
    return NextResponse.json({ success: true, result: "ok" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid delete request." }, { status: 400 });
  }
}
