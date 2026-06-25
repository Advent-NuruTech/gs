"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import { uploadImage } from "@/lib/cloudinary/uploadImage";
import { createDesign, updateDesign } from "@/services/designService";
import { Design, DESIGN_CATEGORIES } from "@/types/design";

interface Props {
  /** When provided, the form edits an existing design instead of creating one. */
  design?: Design;
}

/** Reads a file's natural pixel dimensions so the gallery can render it uncropped. */
function readDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export default function DesignUploadForm({ design }: Props) {
  const router = useRouter();
  const { profile } = useAuth();
  const { pushToast } = useNotificationContext();
  const editing = Boolean(design);

  const [title, setTitle] = useState(design?.title ?? "");
  const [description, setDescription] = useState(design?.description ?? "");
  const [category, setCategory] = useState(design?.category ?? DESIGN_CATEGORIES[0]);
  const [imageUrl, setImageUrl] = useState(design?.imageUrl ?? "");
  const [dims, setDims] = useState<{ width?: number; height?: number }>({
    width: design?.imageWidth,
    height: design?.imageHeight,
  });
  const [downloadPrice, setDownloadPrice] = useState(String(design?.downloadPrice ?? ""));
  const [customizationPrice, setCustomizationPrice] = useState(String(design?.customizationPrice ?? ""));
  const [published, setPublished] = useState(design?.published ?? true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const [url, d] = await Promise.all([uploadImage(file, "adventskool/designs"), readDimensions(file)]);
      setImageUrl(url);
      setDims({ width: d.width || undefined, height: d.height || undefined });
    } catch {
      pushToast("Image upload failed. Try again.", "error");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile || profile.role !== "admin") {
      pushToast("Only admins can manage designs.", "error");
      return;
    }
    if (!title.trim() || !imageUrl) {
      pushToast("Add a title and upload the design image.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        imageUrl,
        imageWidth: dims.width,
        imageHeight: dims.height,
        downloadPrice: Number(downloadPrice || 0),
        customizationPrice: Number(customizationPrice || 0),
        published,
      };
      if (editing && design) {
        await updateDesign(design.id, payload);
        pushToast("Design updated.", "success");
      } else {
        await createDesign({ ...payload, createdBy: profile.id });
        pushToast("Design published.", "success");
      }
      router.push("/dashboard/admin/designs");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not save design.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">Design Image</p>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="preview" className="max-h-72 w-auto rounded-lg border border-slate-200" />
        ) : null}
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 text-sm font-medium text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600">
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          {uploading ? "Uploading…" : imageUrl ? "Replace image" : "Upload design image"}
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Bold Tech Review Thumbnail" required />

      <label className="flex w-full flex-col gap-2 text-sm font-medium text-slate-700">
        <span>Description (optional)</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Short description shown on the design page (good for SEO)."
          className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-blue-500 transition focus:ring-2"
        />
      </label>

      <label className="flex w-full flex-col gap-2 text-sm font-medium text-slate-700">
        <span>Category</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-blue-500 transition focus:ring-2"
        >
          {DESIGN_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Download Price (Ksh)"
          type="number"
          min="0"
          value={downloadPrice}
          onChange={(e) => setDownloadPrice(e.target.value)}
          placeholder="e.g. 200"
        />
        <Input
          label="Customization Fee (Ksh)"
          type="number"
          min="0"
          value={customizationPrice}
          onChange={(e) => setCustomizationPrice(e.target.value)}
          placeholder="e.g. 500"
        />
      </div>
      <p className="text-xs text-slate-500">
        These are billed separately. <span className="font-semibold text-slate-700">Download</span> charges only the
        download price and delivers the file instantly. <span className="font-semibold text-slate-700">Customization</span>{" "}
        charges only the customization fee — no download fee is added. Leave a price at 0 to disable that option.
      </p>

      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
        Publish to the public gallery
      </label>

      <Button type="submit" disabled={submitting || uploading}>
        {submitting ? "Saving…" : editing ? "Save Changes" : "Publish Design"}
      </Button>
    </form>
  );
}
