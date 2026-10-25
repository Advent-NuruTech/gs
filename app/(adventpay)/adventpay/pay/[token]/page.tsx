"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { CreditCard, LockKeyhole, Smartphone } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";

import Button from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import PageSkeleton from "@/components/ui/PageSkeleton";
import StatusCard from "@/components/ui/StatusCard";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useAsyncData } from "@/hooks/useAsyncData";
import { apiRequest } from "@/lib/api/client";
import { formatKsh } from "@/lib/utils/formatCurrency";
import type { AdventPayPublicInvoice } from "@/types/adventPay";

type PublicPaymentResponse = { authorizationUrl?: string; message?: string };

export default function AdventPayPublicPaymentPage() {
  const { token } = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [provider, setProvider] = useState<"mpesa" | "atl">("mpesa");
  const load = useCallback(() => apiRequest<{ invoice: AdventPayPublicInvoice }>(`/api/advent-pay/public/${encodeURIComponent(token)}`), [token]);
  const { data, isLoading, errorMessage, reload } = useAsyncData(load, [load]);
  const pay = useAsyncAction({
    action: async (method: "checkout" | "mobile_money") => apiRequest<PublicPaymentResponse>(`/api/advent-pay/public/${encodeURIComponent(token)}`, {
      method: "POST", body: JSON.stringify(method === "checkout" ? { method, email } : { method, phone, provider }),
    }),
    successMessage: (result) => result.message ?? "Opening secure Paystack checkout…",
    onSuccess: (result) => { if (result.authorizationUrl) window.location.assign(result.authorizationUrl); },
  });
  const verify = useAsyncAction({ action: async () => { if (!reference?.startsWith("ap_")) throw new Error("Invalid payment reference."); await apiRequest(`/api/advent-pay/verify?reference=${encodeURIComponent(reference)}`); }, successMessage: "Payment confirmed. Thank you.", onSuccess: reload });

  useEffect(() => { if (reference?.startsWith("ap_")) void verify.run(); }, [reference, verify.run]);

  if (isLoading && !data) return <PageSkeleton label="Loading secure payment…" variant="cards" />;
  if (errorMessage || !data) return <main className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6"><StatusCard kind="error" title="Payment link unavailable" description={errorMessage || "This payment link is unavailable."} /></main>;

  const invoice = data.invoice;
  return <main className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6">
    <Card><CardHeader title="Secure payment" description={`Invoice ${invoice.invoiceNumber}`} /><CardBody><div className="space-y-5">
      <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800"><p className="text-sm font-medium text-slate-600 dark:text-slate-300">What this payment is for</p><p className="mt-1 break-words font-semibold text-slate-950 dark:text-white">{invoice.description}</p><div className="mt-4 flex flex-wrap items-baseline justify-between gap-2"><p className="text-2xl font-bold text-slate-950 dark:text-white">{formatKsh(invoice.amount)}</p><p className="text-sm text-slate-600 dark:text-slate-300">Due {new Date(`${invoice.dueDate}T12:00:00`).toLocaleDateString("en-KE", { dateStyle: "medium" })}</p></div></div>
      {verify.status === "loading" ? <StatusCard kind="loading" title="Confirming payment" description="Please wait while we verify the Paystack transaction." /> : null}
      {verify.status === "success" || invoice.status === "paid" ? <StatusCard kind="success" title="Payment confirmed" description={verify.successMessage || "This invoice has already been paid."} /> : null}
      {verify.status === "error" ? <StatusCard kind="warning" title="Payment is still pending" description={verify.errorMessage} actions={<Button variant="secondary" size="sm" onClick={() => void verify.run()}>Check again</Button>} /> : null}
      {invoice.status === "paid" ? <p className="text-sm text-slate-600 dark:text-slate-300">No further payment is required.</p> : <>
      <StatusCard kind="info" title="Pay only if you recognise this request" description="This link does not reveal account information. Payment is processed securely by Paystack." />
      {pay.status === "loading" ? <StatusCard kind="loading" title="Starting payment" description="Please wait and do not submit again." /> : null}
      {pay.status === "success" && !pay.successMessage.includes("Opening") ? <StatusCard kind="success" title="Phone prompt sent" description={pay.successMessage} /> : null}
      {pay.status === "error" ? <StatusCard kind="error" title="Payment could not start" description={pay.errorMessage} /> : null}
      <form className="space-y-4" onSubmit={(event: FormEvent) => { event.preventDefault(); void pay.run("checkout"); }}>
        <Input label="Email for this payment" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
        <Button type="submit" className="w-full" loading={pay.isLoading} loadingText="Opening checkout…"><CreditCard className="h-4 w-4" /> Pay securely with Paystack</Button>
      </form>
      <div className="border-t border-slate-200 pt-5 dark:border-slate-700"><h2 className="font-semibold text-slate-950 dark:text-white">Prefer a phone prompt?</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Enter the mobile-money number and network to receive a prompt. Enter your PIN on your phone only—never here.</p><form className="mt-4 space-y-4" onSubmit={(event: FormEvent) => { event.preventDefault(); void pay.run("mobile_money"); }}><Input label="Mobile-money phone number" type="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+254712345678" /><label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">Mobile-money network<select value={provider} onChange={(event) => setProvider(event.target.value as "mpesa" | "atl")} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="mpesa">M-PESA (Safaricom)</option><option value="atl">Airtel Money</option></select></label><Button type="submit" variant="secondary" className="w-full" loading={pay.isLoading} loadingText="Sending prompt…"><Smartphone className="h-4 w-4" /> Send phone prompt</Button></form></div>
      <p className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" /> AdventPay never asks for or stores your mobile-money PIN.</p>
      </>}
    </div></CardBody></Card>
  </main>;
}
