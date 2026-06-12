import "server-only";

const PAYSTACK_BASE = "https://api.paystack.co";
const secretKey = process.env.PAYSTACK_SECRET_KEY ?? "";

function authHeaders() {
  return {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/json",
  };
}

export interface InitializeArgs {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

export interface InitializeResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export async function initializeTransaction(args: InitializeArgs): Promise<InitializeResult> {
  const response = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      email: args.email,
      amount: args.amountKobo,
      reference: args.reference,
      currency: "KES",
      callback_url: args.callbackUrl,
      metadata: args.metadata ?? {},
    }),
  });

  const payload = (await response.json()) as {
    status: boolean;
    message: string;
    data?: { authorization_url: string; access_code: string; reference: string };
  };

  if (!response.ok || !payload.status || !payload.data) {
    throw new Error(payload.message || "Could not initialize payment.");
  }

  return {
    authorizationUrl: payload.data.authorization_url,
    accessCode: payload.data.access_code,
    reference: payload.data.reference,
  };
}

export interface VerifyResult {
  status: string; // "success", "failed", ...
  amount: number; // in kobo
  currency: string;
  reference: string;
  paidAt: string | null;
  customerEmail: string | null;
  raw: Record<string, unknown>;
}

export async function verifyTransaction(reference: string): Promise<VerifyResult> {
  const response = await fetch(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: authHeaders(), cache: "no-store" },
  );

  const payload = (await response.json()) as {
    status: boolean;
    message: string;
    data?: {
      status: string;
      amount: number;
      currency: string;
      reference: string;
      paid_at: string | null;
      customer?: { email?: string };
    };
  };

  if (!response.ok || !payload.status || !payload.data) {
    throw new Error(payload.message || "Could not verify payment.");
  }

  return {
    status: payload.data.status,
    amount: payload.data.amount,
    currency: payload.data.currency,
    reference: payload.data.reference,
    paidAt: payload.data.paid_at,
    customerEmail: payload.data.customer?.email ?? null,
    raw: payload.data as Record<string, unknown>,
  };
}
