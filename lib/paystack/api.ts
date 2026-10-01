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
  subaccount?: string;
  transactionChargeKobo?: number;
  feeBearer?: "account" | "subaccount";
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
      ...(args.subaccount ? {
        subaccount: args.subaccount,
        transaction_charge: args.transactionChargeKobo ?? 0,
        bearer: args.feeBearer ?? "account",
      } : {}),
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

export interface PaystackBank {
  name: string;
  code: string;
  active: boolean;
  country: string;
  currency: string;
}

async function paystackRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!secretKey) throw new Error("Paystack secret key is not configured.");
  const response = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const payload = await response.json() as { status: boolean; message: string; data?: T };
  if (!response.ok || !payload.status || payload.data === undefined) {
    throw new Error(payload.message || "Paystack request failed.");
  }
  return payload.data;
}

export async function listKenyanBanks(): Promise<PaystackBank[]> {
  const banks = await paystackRequest<PaystackBank[]>("/bank?currency=KES");
  return banks.filter((bank) => bank.active && bank.currency === "KES");
}

export async function createKenyanSubaccount(input: {
  businessName: string;
  accountHolderName: string;
  accountNumber: string;
  bankCode: string;
  email: string;
  phone: string;
}) {
  const result = await paystackRequest<{
    subaccount_code: string;
    account_name?: string | null;
    account_number?: string;
    settlement_bank?: string;
    active: boolean;
  }>("/subaccount", {
    method: "POST",
    body: JSON.stringify({
      business_name: input.businessName.slice(0, 100),
      bank_code: input.bankCode,
      account_number: input.accountNumber,
      percentage_charge: 0,
      primary_contact_name: input.accountHolderName.slice(0, 100),
      primary_contact_email: input.email,
      primary_contact_phone: input.phone,
      description: "AdventSkool creator payout account",
    }),
  });
  if (!result.subaccount_code || !result.active) throw new Error("Paystack did not activate the creator subaccount.");
  return {
    code: result.subaccount_code,
    accountName: String(result.account_name ?? input.accountHolderName),
    accountLast4: String(result.account_number ?? input.accountNumber).slice(-4),
    bankName: String(result.settlement_bank ?? ""),
  };
}

export interface VerifyResult {
  status: string; // "success", "failed", ...
  amount: number; // in kobo
  currency: string;
  reference: string;
  paidAt: string | null;
  feesKobo: number | null;
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
      fees?: number | null;
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
    feesKobo: typeof payload.data.fees === "number" ? payload.data.fees : null,
    customerEmail: payload.data.customer?.email ?? null,
    raw: payload.data as Record<string, unknown>,
  };
}
