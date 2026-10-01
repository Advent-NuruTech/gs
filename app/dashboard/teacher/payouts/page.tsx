"use client";

import { FormEvent, useState } from "react";
import { Landmark, Percent, Receipt, TrendingUp } from "lucide-react";

import Badge, { BadgeTone } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import PageSkeleton from "@/components/ui/PageSkeleton";
import Select from "@/components/ui/Select";
import StatCard from "@/components/ui/StatCard";
import StatusCard, { FeedbackKind } from "@/components/ui/StatusCard";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useAuth } from "@/hooks/useAuth";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { apiRequest } from "@/lib/api/client";
import { formatKsh } from "@/lib/utils/formatCurrency";
import Link from "next/link";

type PayoutProfile = {
  account_holder_name: string;
  bank_name: string;
  bank_code: string;
  account_last4: string;
  phone_number: string;
  verification_status: string;
  payout_status: string;
};

type Earning = {
  gross_amount: number;
  commission_percent: number;
  platform_commission: number;
  creator_amount: number;
  provider_fee: number | null;
  payout_status: string;
  settlement_mode: string;
  payment_reference: string | null;
  created_at: string;
};

type PayoutData = {
  payout: PayoutProfile | null;
  commission: { commission_percent: number; fee_mode: string } | null;
  earnings: Earning[];
};

type Bank = { code: string; name: string };

type PayoutPayload = PayoutData & { banks: Bank[] };

const VERIFICATION_COPY: Record<string, { label: string; tone: BadgeTone; kind: FeedbackKind; description: string }> = {
  verified: {
    label: "Verified",
    tone: "emerald",
    kind: "success",
    description:
      "Your payout account is verified. You receive your share of new course sales in this account. Paystack sends the money on its normal schedule; earlier sales are not sent automatically.",
  },
  rejected: {
    label: "Needs changes",
    tone: "red",
    kind: "error",
    description:
      "Your payout account was not approved. Check the details below and resubmit, or contact AdventSkool support if the bank says the account is correct.",
  },
  pending: {
    label: "Pending review",
    tone: "amber",
    kind: "warning",
    description:
      "Your payout account is with AdventSkool for review. You can receive money from new course sales once it is approved. We usually finish reviews within one business day.",
  },
};

const NOT_SET_UP: { label: string; tone: BadgeTone; kind: FeedbackKind; description: string } = {
  label: "Not set up",
  tone: "slate",
  kind: "info",
  description:
    "Add your payout account details below, then wait for AdventSkool to review them. You can receive money from course sales after approval.",
};

export default function TeacherPayoutsPage() {
  const { profile } = useAuth();
  const { isAllowed, loading: guardLoading } = useRoleGuard(["teacher"]);

  const { data, isLoading, errorMessage, reload } = useAsyncData<PayoutPayload>(
    async () => {
      const [payoutData, bankData] = await Promise.all([
        apiRequest<PayoutData>("/api/creator/payout"),
        apiRequest<{ banks: Bank[] }>("/api/paystack/banks"),
      ]);
      return { ...payoutData, banks: bankData.banks ?? [] };
    },
    [profile?.id, isAllowed],
  );

  const save = useAsyncAction({
    action: async (payload: Record<string, string>) => {
      await apiRequest("/api/creator/payout", { method: "PUT", body: JSON.stringify(payload) });
    },
    successMessage: "Payout details saved. AdventSkool will review them before your next course sale is paid out.",
    onSuccess: () => {
      reload();
    },
  });

  if (guardLoading || !isAllowed) {
    return <PageSkeleton label="Checking your access to payout details…" variant="plain" />;
  }

  if (isLoading && !data) {
    return <PageSkeleton label="Loading your payout details and earnings…" variant="form" />;
  }

  const payout = data?.payout ?? null;
  const earnings = data?.earnings ?? [];
  const total = earnings.reduce((sum, row) => sum + Number(row.creator_amount), 0);
  const pending = earnings
    .filter((row) => row.payout_status === "pending")
    .reduce((sum, row) => sum + Number(row.creator_amount), 0);
  const routed = earnings
    .filter((row) => row.payout_status === "routed")
    .reduce((sum, row) => sum + Number(row.creator_amount), 0);
  const commissionPercent = data?.commission?.commission_percent ?? 10;
  const creatorBearsFee = (data?.commission?.fee_mode ?? "exclusive") === "exclusive";
  const status = (payout ? VERIFICATION_COPY[payout.verification_status] : undefined) ?? NOT_SET_UP;

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-bold text-slate-900">Payout details</h2>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <p className="text-sm text-slate-600">
          Add the Kenyan bank account where AdventSkool can send your creator earnings. Only you and AdventSkool
          administrators can access these details.
        </p>
      </header>

      {save.isLoading ? (
        <StatusCard kind="loading" title="Saving your payout details…" description="Paystack is registering this account. Keep this page open." />
      ) : null}
      {save.status === "success" && save.successMessage ? (
        <StatusCard kind="success" title="Payout details saved" description={save.successMessage} onDismiss={save.reset} />
      ) : null}
      {save.status === "error" && save.errorMessage ? (
        <StatusCard kind="error" title="We could not save your payout details" description={save.errorMessage} />
      ) : null}
      {errorMessage && !isLoading ? (
        <StatusCard
          kind="error"
          title="We could not load your payout details"
          description={errorMessage}
          actions={
            <Button type="button" variant="secondary" size="sm" onClick={reload} loading={isLoading}>
              Try again
            </Button>
          }
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Your commission"
          value={`${commissionPercent}%`}
          hint={creatorBearsFee ? "You also bear the Paystack fee" : "AdventSkool bears the Paystack fee"}
          icon={<Percent className="h-4 w-4" aria-hidden="true" />}
        />
        <StatCard label="Recorded earnings" value={formatKsh(total)} icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />} />
        <StatCard
          label="Waiting for payment"
          value={formatKsh(pending)}
          tone="warning"
          hint="Recorded, not yet confirmed by Paystack"
        />
        <StatCard
          label="Sent for payout"
          value={formatKsh(routed)}
          tone="positive"
          hint="Accepted by Paystack for settlement"
        />
      </div>

      <StatusCard
        kind={status.kind}
        title={`Payout account: ${status.label}`}
        description={status.description}
      />

      <Card>
        <CardHeader
          title="Creator payout agreement"
          description="Standard terms are a 10% AdventSkool commission, with Paystack processing fees charged to the creator."
          actions={<Link href="/creator-payout-agreement" className="text-sm font-semibold text-blue-700 underline">Read agreement</Link>}
        />
        <CardBody>
          <p className="text-sm text-slate-600">Special commission or fee arrangements can be discussed with AdventSkool at <a className="font-semibold text-blue-700 underline" href="mailto:adventskool@gmail.com?subject=Creator%20payout%20special%20deal">adventskool@gmail.com</a>. Any approved special arrangement must be confirmed in writing and saved to your creator payout settings before it applies to new sales.</p>
        </CardBody>
      </Card>

      <PayoutForm
        key={`${payout?.bank_code ?? "none"}-${payout?.account_last4 ?? "none"}-${payout?.verification_status ?? "none"}`}
        payout={payout}
        banks={data?.banks ?? []}
        defaultPhone={profile?.phone ?? ""}
        isSaving={save.isLoading}
        onSave={(payload) => save.run(payload)}
      />

      <Card>
        <CardHeader
          title="Earnings history"
          description="Every recorded course sale, your share of it, and where it is in the payout process."
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {["Date", "Payment reference", "Sale amount", "AdventSkool fee", "Your share", "Payment fee", "Status"].map(
                  (heading) => (
                    <th key={heading} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {earnings.map((row, index) => (
                <tr key={`${row.created_at}-${index}`} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{new Date(row.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.payment_reference ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">{formatKsh(Number(row.gross_amount))}</td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">{row.commission_percent}%</td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums">
                    {formatKsh(Number(row.creator_amount))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                    {row.provider_fee == null ? "Not reported" : formatKsh(Number(row.provider_fee))}
                  </td>
                  <td className="px-4 py-3">
                    <EarningStatusBadge payoutStatus={row.payout_status} />
                  </td>
                </tr>
              ))}
              {earnings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center">
                    <Receipt className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
                    <p className="mt-2 text-sm font-semibold text-slate-700">No earnings recorded yet</p>
                    <p className="text-sm text-slate-500">Earnings appear here after a successful course sale.</p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}

function EarningStatusBadge({ payoutStatus }: { payoutStatus: string }) {
  if (payoutStatus === "routed") return <Badge tone="emerald">Sent for payout</Badge>;
  if (payoutStatus === "pending") return <Badge tone="amber">Waiting for payment</Badge>;
  return <Badge tone="slate">{payoutStatus || "Unknown"}</Badge>;
}

interface PayoutFormProps {
  payout: PayoutProfile | null;
  banks: Bank[];
  defaultPhone: string;
  isSaving: boolean;
  onSave: (payload: Record<string, string>) => void;
}

function PayoutForm({ payout, banks, defaultPhone, isSaving, onSave }: PayoutFormProps) {
  const [form, setForm] = useState({
    accountHolderName: payout?.account_holder_name ?? "",
    bankCode: payout?.bank_code ?? "",
    accountNumber: "",
    phoneNumber: payout?.phone_number || defaultPhone,
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(form);
  }

  return (
    <Card>
      <CardHeader
        title={payout ? "Payout account" : "Add your payout account"}
        description={
          payout
            ? `Currently ${payout.bank_name} · account ending ${payout.account_last4 || "????"}. Submit again to replace it.`
            : "Paystack registers this account for you. AdventSkool only stores the Paystack reference and your last four digits."
        }
        actions={payout ? <Badge tone="slate">Last four digits stored</Badge> : null}
      />
      <CardBody>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <Input
            id="account-holder-name"
            label="Account holder name"
            required
            autoComplete="name"
            disabled={isSaving}
            value={form.accountHolderName}
            onChange={(event) => setForm({ ...form, accountHolderName: event.target.value })}
          />
          <Select
            id="bank-code"
            label="Kenyan bank"
            required
            disabled={isSaving}
            placeholder="Select your bank"
            value={form.bankCode}
            onChange={(event) => setForm({ ...form, bankCode: event.target.value })}
            options={banks.map((bank) => ({ value: bank.code, label: bank.name }))}
          />
          <Input
            id="account-number"
            label="Account number"
            hint="Your full account number is sent straight to Paystack and then discarded."
            required
            inputMode="numeric"
            autoComplete="off"
            maxLength={20}
            disabled={isSaving}
            value={form.accountNumber}
            onChange={(event) => setForm({ ...form, accountNumber: event.target.value.replace(/\D/g, "") })}
          />
          <Input
            id="phone-number"
            label="Phone number"
            required
            type="tel"
            autoComplete="tel"
            disabled={isSaving}
            value={form.phoneNumber}
            onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })}
          />
          <div className="flex flex-wrap items-center gap-3 md:col-span-2">
            <Button type="submit" loading={isSaving} loadingText="Saving payout details…">
              {payout ? "Update payout details" : "Save payout details"}
            </Button>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Landmark className="h-4 w-4" aria-hidden="true" />
              Only you and AdventSkool administrators can see these details.
            </span>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
