"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Loader2, Lock, Upload, X } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import { uploadImage } from "@/lib/cloudinary/uploadImage";
import { formatKsh } from "@/lib/utils/formatCurrency";
import { startDesignOrder } from "@/services/designOrderService";
import { Design } from "@/types/design";

interface Props {
  design: Design;
  open: boolean;
  onClose: () => void;
}

export default function CustomizeModal({ design, open, onClose }: Props) {
  const { pushToast } = useNotificationContext();
  const { profile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [titleText, setTitleText] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [preferredColors, setPreferredColors] = useState("");
  const [preferredStyle, setPreferredStyle] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Optional convenience: prefill contact details from the signed-in account so
  // returning users don't retype them. Never required — guests can order too.
  useEffect(() => {
    if (!open || !profile) return;
    setFullName((current) => current || profile.displayName || "");
    setEmail((current) => current || profile.email || "");
    setPhone((current) => current || profile.phone || "");
  }, [open, profile]);

  const fee = Math.max(0, Number(design.customizationPrice || 0));

  if (!open) return null;

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(files.map((file) => uploadImage(file, "adventskool/design-orders")));
      setUploadedImages((current) => [...current, ...urls].slice(0, 12));
    } catch {
      pushToast("Some images failed to upload. Try again.", "error");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const removeImage = (url: string) => {
    setUploadedImages((current) => current.filter((item) => item !== url));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!fullName.trim() || !email.includes("@") || !phone.trim() || !titleText.trim()) {
      pushToast("Please fill your name, email, phone, and the title text.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const { authorizationUrl } = await startDesignOrder({
        designId: design.id,
        kind: "customization",
        fullName,
        email,
        phone,
        whatsapp,
        titleText,
        subtitle,
        instructions,
        preferredColors,
        preferredStyle,
        uploadedImages,
      });
      window.location.href = authorizationUrl;
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not start payment.", "error");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 sm:items-center">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Get Customized Like This</h2>
            <p className="text-sm text-slate-500">{design.title}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-5">
          <fieldset className="space-y-3">
            <legend className="text-sm font-bold uppercase tracking-wide text-slate-700">Your Contact Details</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required />
              <Input label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
              <Input label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXX" required />
              <Input label="WhatsApp Number" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="07XX XXX XXX" />
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-bold uppercase tracking-wide text-slate-700">Design Requirements</legend>
            <Input label="Exact Title / Text on the design" value={titleText} onChange={(e) => setTitleText(e.target.value)} placeholder="e.g. SUNDAY REVIVAL SERVICE" required />
            <Input label="Subtitle (optional)" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="e.g. Guest Speaker: Pastor James" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Preferred Colors" value={preferredColors} onChange={(e) => setPreferredColors(e.target.value)} placeholder="e.g. Navy blue & gold" />
              <Input label="Preferred Style" value={preferredStyle} onChange={(e) => setPreferredStyle(e.target.value)} placeholder="e.g. Modern, minimal" />
            </div>
            <label className="flex w-full flex-col gap-2 text-sm font-medium text-slate-700">
              <span>Additional Instructions</span>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={4}
                placeholder="Anything else we should know — dates, venue, logo placement, tone…"
                className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-blue-500 transition focus:ring-2"
              />
            </label>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-bold uppercase tracking-wide text-slate-700">Your Photos, Logos &amp; Assets</legend>
            <p className="text-xs text-slate-500">Upload personal photos, logos, event images, or branding assets (up to 12).</p>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 text-sm font-medium text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600">
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              {uploading ? "Uploading…" : "Click to upload images"}
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
            {uploadedImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {uploadedImages.map((url) => (
                  <div key={url} className="group relative overflow-hidden rounded-lg border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="upload" className="h-20 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </fieldset>
        </form>

        <div className="space-y-3 border-t border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-base">
            <span className="font-semibold text-slate-900">Customization fee</span>
            <span className="font-bold text-indigo-600">{formatKsh(fee)}</span>
          </div>
          <Button type="button" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={submitting || uploading} onClick={handleSubmit}>
            <span className="inline-flex items-center justify-center gap-2">
              <Lock className="h-4 w-4" />
              {submitting ? "Redirecting to Paystack…" : `Pay ${formatKsh(fee)} & Submit`}
            </span>
          </Button>
          <p className="text-center text-xs text-slate-400">
            This covers customization only — no download fee is added. Payment is processed securely by Paystack and your
            order is submitted only after payment succeeds.
          </p>
        </div>
      </div>
    </div>
  );
}
