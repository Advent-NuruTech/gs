import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { initializeTransaction } from "@/lib/paystack/api";
import { toDownloadUrl } from "@/lib/designs/downloadUrl";
import { notifyAdminsOfDesignOrder } from "@/lib/designs/fulfill";

export const runtime = "nodejs";

interface CheckoutBody {
  designId?: string;
  kind?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  titleText?: string;
  subtitle?: string;
  instructions?: string;
  preferredColors?: string;
  preferredStyle?: string;
  uploadedImages?: string[];
}

function clean(value: unknown, max = 2000): string {
  return String(value ?? "").trim().slice(0, max);
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as CheckoutBody;

  const designId = clean(body.designId, 64);
  const kind = body.kind === "download" ? "download" : "customization";
  const fullName = clean(body.fullName, 160);
  const email = clean(body.email, 200);
  const phone = clean(body.phone, 40);
  const titleText = clean(body.titleText, 500);

  // Contact details are required for both flows (Paystack receipt + delivery).
  if (!designId || !fullName || !email.includes("@") || !phone) {
    return NextResponse.json(
      { error: "Please provide your name, a valid email, and phone number." },
      { status: 400 },
    );
  }
  // Customization additionally needs the text to put on the design.
  if (kind === "customization" && !titleText) {
    return NextResponse.json(
      { error: "Please provide the title text for your custom design." },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdminClient();

  // Trust the design row for pricing — never the client.
  // Select * so the route keeps working whether or not the file_url column has
  // been migrated yet (a missing named column would error the whole query).
  const { data: design } = await admin
    .from("designs")
    .select("*")
    .eq("id", designId)
    .maybeSingle();

  if (!design || !design.published) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }

  // Each purchase is billed independently — download price OR customization fee,
  // never both. Download never carries a customization charge and vice versa.
  // An amount of 0 means the admin made it free: no payment is required.
  const amount =
    kind === "download"
      ? Math.max(0, Number(design.download_price ?? 0))
      : Math.max(0, Number(design.customization_price ?? 0));
  const isFree = amount <= 0;

  // Customization-only details: keep only https Cloudinary URLs the client sent.
  const uploadedImages =
    kind === "customization" && Array.isArray(body.uploadedImages)
      ? body.uploadedImages
          .map((url) => clean(url, 500))
          .filter((url) => url.startsWith("https://"))
          .slice(0, 12)
      : [];

  const reference = `${isFree ? "free" : "dz"}_${crypto.randomUUID().replace(/-/g, "")}`;

  const { error: insertError } = await admin.from("design_orders").insert({
    design_id: designId,
    design_title: String(design.title ?? ""),
    kind,
    full_name: fullName,
    email,
    phone,
    whatsapp: clean(body.whatsapp, 40),
    title_text: kind === "customization" ? titleText : "",
    subtitle: kind === "customization" ? clean(body.subtitle, 500) : "",
    instructions: kind === "customization" ? clean(body.instructions, 4000) : "",
    preferred_colors: kind === "customization" ? clean(body.preferredColors, 300) : "",
    preferred_style: kind === "customization" ? clean(body.preferredStyle, 300) : "",
    uploaded_images: uploadedImages,
    amount,
    currency: "KES",
    paystack_reference: reference,
    // Free orders need no payment: mark them settled up-front. Downloads are
    // self-serve (delivered) and customization requests await the team.
    payment_status: isFree ? "success" : "pending",
    order_status: isFree && kind === "download" ? "delivered" : "pending",
    paid_at: isFree ? new Date().toISOString() : null,
  });
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  // Free flow: skip Paystack entirely. Bump the orders counter, notify the team
  // for customization requests, and hand the file straight back for downloads.
  if (isFree) {
    const { data: countRow } = await admin
      .from("designs")
      .select("orders_count")
      .eq("id", designId)
      .maybeSingle();
    if (countRow) {
      await admin
        .from("designs")
        .update({ orders_count: Number(countRow.orders_count ?? 0) + 1 })
        .eq("id", designId);
    }

    if (kind === "customization") {
      await notifyAdminsOfDesignOrder({
        full_name: fullName,
        design_title: String(design.title ?? ""),
        amount: 0,
        paystack_reference: reference,
        email,
        phone,
        whatsapp: clean(body.whatsapp, 40),
      }).catch(() => {});
    }

    const deliverable = String(design.file_url ?? "") || String(design.image_url ?? "");
    const downloadUrl =
      kind === "download" && deliverable
        ? toDownloadUrl(deliverable, String(design.title ?? "design"))
        : undefined;

    return NextResponse.json({ free: true, reference, amount: 0, kind, downloadUrl });
  }

  const callbackUrl = `${request.nextUrl.origin}/designs/checkout/success`;

  try {
    const result = await initializeTransaction({
      email,
      amountKobo: Math.round(amount * 100),
      reference,
      callbackUrl,
      metadata: { designId, type: "design_order", kind, customer: fullName },
    });

    await admin
      .from("design_orders")
      .update({ paystack_access_code: result.accessCode })
      .eq("paystack_reference", reference);

    return NextResponse.json({ authorizationUrl: result.authorizationUrl, reference, amount });
  } catch (error) {
    await admin
      .from("design_orders")
      .update({ payment_status: "failed" })
      .eq("paystack_reference", reference);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start payment." },
      { status: 502 },
    );
  }
}
