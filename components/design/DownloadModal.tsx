"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { BookOpen, Download, Lock, X } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import { formatKsh } from "@/lib/utils/formatCurrency";
import { startDesignOrder } from "@/services/designOrderService";
import { Design } from "@/types/design";
import { ProductAccessMode } from "@/types/designOrder";

interface Props {
  design: Design;
  open: boolean;
  onClose: () => void;
  initialAccessMode?: ProductAccessMode;
}

/** Purchase checkout for a downloadable or account-based digital product. */
export default function DownloadModal({
  design,
  open,
  onClose,
  initialAccessMode = "download",
}: Props) {
  const { pushToast } = useNotificationContext();
  const { profile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [accessMode, setAccessMode] = useState<ProductAccessMode>(initialAccessMode);
  const [submitting, setSubmitting] = useState(false);

  const price = Math.max(0, Number(design.downloadPrice || 0));
  const customerName = fullName || profile?.displayName || "";
  const customerEmail = email || profile?.email || "";
  const customerPhone = phone || profile?.phone || "";
  if (!open) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (accessMode === "read_online" && !profile) return;
    if (!customerName.trim() || !customerEmail.includes("@") || !customerPhone.trim()) {
      pushToast("Please fill your name, email, and phone.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const result = await startDesignOrder({
        designId: design.id,
        kind: "download",
        accessMode,
        fullName: customerName,
        email: customerEmail,
        phone: customerPhone,
      });
      if (result.free) {
        if (result.libraryUrl) {
          window.location.href = result.libraryUrl;
          return;
        }
        if (result.downloadUrl) window.location.href = result.downloadUrl;
        setSubmitting(false);
        onClose();
        return;
      }
      window.location.href = result.authorizationUrl!;
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not start your purchase.", "error");
      setSubmitting(false);
    }
  };

  const returnPath = `/designs/${design.id}?purchase=read`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 sm:items-center">
      <form onSubmit={handleSubmit} className="my-8 w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Get this digital product</h2>
            <p className="text-sm text-slate-500">{design.title}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Product price</p>
            <p className="text-2xl font-black text-indigo-700">{formatKsh(price)}</p>
            <p className="mt-1 text-xs text-slate-500">Pay once, then read online or download the full product.</p>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-slate-800">How would you like to access it?</legend>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAccessMode("read_online")}
                className={`rounded-xl border p-3 text-left transition ${
                  accessMode === "read_online"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-800"
                    : "border-slate-200 text-slate-600 hover:border-indigo-300"
                }`}
              >
                <BookOpen className="mb-2 h-5 w-5" />
                <span className="block text-sm font-bold">Read online</span>
                <span className="text-xs">Keep it in your dashboard</span>
              </button>
              <button
                type="button"
                onClick={() => setAccessMode("download")}
                className={`rounded-xl border p-3 text-left transition ${
                  accessMode === "download"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-800"
                    : "border-slate-200 text-slate-600 hover:border-indigo-300"
                }`}
              >
                <Download className="mb-2 h-5 w-5" />
                <span className="block text-sm font-bold">Download</span>
                <span className="text-xs">Save the full file</span>
              </button>
            </div>
          </fieldset>

          {accessMode === "read_online" && !profile ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-semibold">Sign in to build your product library</p>
              <p className="mt-1 text-xs text-amber-800">Your purchase will appear in your dashboard so you can return and keep reading.</p>
              <div className="mt-3 flex gap-2">
                <Link href={`/login?redirect=${encodeURIComponent(returnPath)}`} className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-bold text-white">
                  Sign in
                </Link>
                <Link href={`/register?redirect=${encodeURIComponent(returnPath)}`} className="rounded-md border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700">
                  Create account
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              <Input label="Full Name" value={customerName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required />
              <Input label="Email Address" type="email" value={customerEmail} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
              <Input label="Phone Number" value={customerPhone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXX" required />
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-slate-200 px-6 py-4">
          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={submitting || (accessMode === "read_online" && !profile)}>
            <span className="inline-flex items-center justify-center gap-2">
              {submitting ? <Lock className="h-4 w-4" /> : accessMode === "read_online" ? <BookOpen className="h-4 w-4" /> : <Download className="h-4 w-4" />}
              {submitting
                ? "Redirecting to Paystack…"
                : `${price <= 0 ? "Get free" : `Pay ${formatKsh(price)}`} & ${accessMode === "read_online" ? "Read Online" : "Download"}`}
            </span>
          </Button>
          <p className="text-center text-xs text-slate-400">
            {price <= 0 ? "No payment is required for this product." : "Payment is processed securely by Paystack. Access is enabled as soon as payment succeeds."}
          </p>
        </div>
      </form>
    </div>
  );
}
