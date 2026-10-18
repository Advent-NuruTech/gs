import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { initializeTransaction } from "@/lib/paystack/api";
import { proxyWealthDownloadUrl } from "@/lib/wealth/downloadUrl";
import { notifyAdminsOfWealthOrder } from "@/lib/wealth/fulfill";

export const runtime = "nodejs";

interface CheckoutBody {
  productId?: string;
  kind?: string;
  accessMode?: string;
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

  const productId = clean(body.productId, 64);
  const kind = body.kind === "download" ? "download" : "customization";
  const accessMode = kind === "download" && body.accessMode === "read_online" ? "read_online" : "download";
  const fullName = clean(body.fullName, 160);
  const email = clean(body.email, 200);
  const phone = clean(body.phone, 40);
  const titleText = clean(body.titleText, 500);

  // Contact details are required for both flows (Paystack receipt + delivery).
  if (!productId || !fullName || !email.includes("@") || !phone) {
    return NextResponse.json(
      { error: "Please provide your name, a valid email, and phone number." },
      { status: 400 },
    );
  }
  // Personalization additionally needs the goal text.
  if (kind === "customization" && !titleText) {
    return NextResponse.json(
      { error: "Please tell us what this resource is for." },
      { status: 400 },
    );
  }

  const serverClient = await getSupabaseServerClient();
  const {
    data: { user },
  } = await serverClient.auth.getUser();

  if (accessMode === "read_online" && !user) {
    return NextResponse.json(
      { error: "Please sign in or create an account to read this resource online." },
      { status: 401 },
    );
  }

  // Online purchases belong to the authenticated account. This prevents a
  // mistyped checkout email from hiding the resource from the buyer's library.
  const customerEmail = accessMode === "read_online" && user?.email ? user.email : email;
  const admin = getSupabaseAdminClient();

  // Trust the resource row for pricing — never the client.
  const { data: product } = await admin
    .from("wealth_products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();

  if (!product || !product.published) {
    return NextResponse.json({ error: "Wealth resource not found." }, { status: 404 });
  }

  // Each purchase is billed independently — access price OR personalization fee,
  // never both. An amount of 0 means the admin made it free: no payment required.
  const amount =
    kind === "download"
      ? Math.max(0, Number(product.download_price ?? 0))
      : Math.max(0, Number(product.customization_price ?? 0));
  const isFree = amount <= 0;

  // Personalization-only details: keep only https Cloudinary URLs the client sent.
  const uploadedImages =
    kind === "customization" && Array.isArray(body.uploadedImages)
      ? body.uploadedImages
          .map((url) => clean(url, 500))
          .filter((url) => url.startsWith("https://"))
          .slice(0, 12)
      : [];

  const reference = `${isFree ? "free" : "wz"}_${crypto.randomUUID().replace(/-/g, "")}`;

  const { error: insertError } = await admin.from("wealth_orders").insert({
    product_id: productId,
    product_title: String(product.title ?? ""),
    kind,
    full_name: fullName,
    email: customerEmail,
    user_id: user?.id ?? null,
    access_mode: accessMode,
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
    // self-serve (delivered) and personalization requests await the team.
    payment_status: isFree ? "success" : "pending",
    order_status: isFree && kind === "download" ? "delivered" : "pending",
    paid_at: isFree ? new Date().toISOString() : null,
  });
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  // Free flow: skip Paystack entirely. Bump the orders counter, notify the team
  // for personalization requests, and hand the file straight back for downloads.
  if (isFree) {
    const { data: countRow } = await admin
      .from("wealth_products")
      .select("orders_count")
      .eq("id", productId)
      .maybeSingle();
    if (countRow) {
      await admin
        .from("wealth_products")
        .update({ orders_count: Number(countRow.orders_count ?? 0) + 1 })
        .eq("id", productId);
    }

    await notifyAdminsOfWealthOrder({
      kind,
      full_name: fullName,
      product_title: String(product.title ?? ""),
      amount: 0,
      paystack_reference: reference,
      email: customerEmail,
      phone,
      whatsapp: clean(body.whatsapp, 40),
    }).catch(() => {});

    const deliverable = String(product.file_url ?? "") || String(product.image_url ?? "");
    const downloadUrl =
      kind === "download" && accessMode === "download" && deliverable
        ? proxyWealthDownloadUrl(productId, reference)
        : undefined;
    const { data: freeOrder } = await admin
      .from("wealth_orders")
      .select("id")
      .eq("paystack_reference", reference)
      .maybeSingle();
    const libraryUrl =
      kind === "download" && accessMode === "read_online" && freeOrder?.id
        ? `/dashboard/wealth/${freeOrder.id}/read`
        : undefined;

    return NextResponse.json({ free: true, reference, amount: 0, kind, accessMode, downloadUrl, libraryUrl });
  }

  const callbackUrl = `${request.nextUrl.origin}/wealth/checkout/success`;

  try {
    const result = await initializeTransaction({
      email: customerEmail,
      amountKobo: Math.round(amount * 100),
      reference,
      callbackUrl,
      metadata: { productId, type: "wealth_order", kind, accessMode, userId: user?.id, customer: fullName },
    });

    await admin
      .from("wealth_orders")
      .update({ paystack_access_code: result.accessCode })
      .eq("paystack_reference", reference);

    return NextResponse.json({ authorizationUrl: result.authorizationUrl, reference, amount });
  } catch (error) {
    await admin
      .from("wealth_orders")
      .update({ payment_status: "failed" })
      .eq("paystack_reference", reference);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start payment." },
      { status: 502 },
    );
  }
}
