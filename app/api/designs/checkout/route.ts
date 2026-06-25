import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { initializeTransaction } from "@/lib/paystack/api";

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
  const { data: design } = await admin
    .from("designs")
    .select("id, title, download_price, customization_price, published")
    .eq("id", designId)
    .maybeSingle();

  if (!design || !design.published) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }

  // Each purchase is billed independently — download price OR customization fee,
  // never both. Download never carries a customization charge and vice versa.
  const amount =
    kind === "download"
      ? Math.max(0, Number(design.download_price ?? 0))
      : Math.max(0, Number(design.customization_price ?? 0));
  if (amount <= 0) {
    return NextResponse.json(
      {
        error:
          kind === "download"
            ? "This design is not available for download."
            : "This design is not available for customization.",
      },
      { status: 400 },
    );
  }

  // Customization-only details: keep only https Cloudinary URLs the client sent.
  const uploadedImages =
    kind === "customization" && Array.isArray(body.uploadedImages)
      ? body.uploadedImages
          .map((url) => clean(url, 500))
          .filter((url) => url.startsWith("https://"))
          .slice(0, 12)
      : [];

  const reference = `dz_${crypto.randomUUID().replace(/-/g, "")}`;

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
    payment_status: "pending",
    order_status: "pending",
  });
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
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
