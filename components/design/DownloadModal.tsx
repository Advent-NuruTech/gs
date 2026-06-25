"use client";

import { FormEvent, useEffect, useState } from "react";
import { Download, Lock, X } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import { formatKsh } from "@/lib/utils/formatCurrency";
import { startDesignOrder } from "@/services/designOrderService";
import { Design } from "@/types/design";

interface Props {
  design: Design;
  open: boolean;
  onClose: () => void;
}

/**
 * Instant-download checkout. The customer pays only the download price (no
 * customization fee) and receives the full-quality file the moment payment
 * clears. We collect just enough contact info for the receipt + delivery.
 */
export default function DownloadModal({ design, open, onClose }: Props) {
  const { pushToast } = useNotificationContext();
  const { profile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Optional prefill from the signed-in account — never required.
  useEffect(() => {
    if (!open || !profile) return;
    setFullName((current) => current || profile.displayName || "");
    setEmail((current) => current || profile.email || "");
    setPhone((current) => current || profile.phone || "");
  }, [open, profile]);

  const price = Math.max(0, Number(design.downloadPrice || 0));

  if (!open) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!fullName.trim() || !email.includes("@") || !phone.trim()) {
      pushToast("Please fill your name, email, and phone.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const result = await startDesignOrder({
        designId: design.id,
        kind: "download",
        fullName,
        email,
        phone,
      });
      if (result.free) {
        // Free download — hand over the file straight away, no payment.
        if (result.downloadUrl) window.location.href = result.downloadUrl;
        setSubmitting(false);
        onClose();
        return;
      }
      window.location.href = result.authorizationUrl!;
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not start your download.", "error");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 sm:items-center">
      <form onSubmit={handleSubmit} className="my-8 w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Download this design</h2>
            <p className="text-sm text-slate-500">{design.title}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Download price</p>
            <p className="text-2xl font-black text-indigo-700">{formatKsh(price)}</p>
            <p className="mt-1 text-xs text-slate-500">Full-quality file, ready instantly after payment. No customization fee.</p>
          </div>

          <div className="grid gap-3">
            <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required />
            <Input label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
            <Input label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXX" required />
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-200 px-6 py-4">
          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={submitting}>
            <span className="inline-flex items-center justify-center gap-2">
              {submitting ? <Lock className="h-4 w-4" /> : <Download className="h-4 w-4" />}
              {submitting ? "Redirecting to Paystack…" : `Pay ${formatKsh(price)} & Download`}
            </span>
          </Button>
          <p className="text-center text-xs text-slate-400">
            Payment is processed securely by Paystack. Your download starts as soon as payment succeeds.
          </p>
        </div>
      </form>
    </div>
  );
}
