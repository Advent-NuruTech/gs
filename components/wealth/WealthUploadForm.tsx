"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import { uploadAsset } from "@/lib/cloudinary/uploadImage";
import { createWealthProduct, listWealthCategories, updateWealthProduct } from "@/services/wealthService";
import { WealthProduct, WealthProductFileType, WEALTH_CATEGORIES } from "@/types/wealth";

interface Props {
  /** When provided, the form edits an existing resource instead of creating one. */
  product?: WealthProduct;
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

export default function WealthUploadForm({ product }: Props) {
  const router = useRouter();
  const { profile } = useAuth();
  const { pushToast } = useNotificationContext();
  const editing = Boolean(product);

  const [title, setTitle] = useState(product?.title ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [category, setCategory] = useState(product?.category ?? WEALTH_CATEGORIES[0]);
  // Category list starts from the presets; admins can add their own on the fly.
  const [categories, setCategories] = useState<string[]>(() => {
    const base = [...WEALTH_CATEGORIES] as string[];
    if (product?.category && !base.some((c) => c.toLowerCase() === product.category.toLowerCase())) {
      base.unshift(product.category);
    }
    return base;
  });
  const [newCategory, setNewCategory] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const [fileUrl, setFileUrl] = useState(product?.fileUrl ?? product?.imageUrl ?? "");
  const [fileType, setFileType] = useState<WealthProductFileType>(product?.fileType ?? "image");
  const [pageCount, setPageCount] = useState<number | undefined>(product?.pageCount);
  const [dims, setDims] = useState<{ width?: number; height?: number }>({
    width: product?.imageWidth,
    height: product?.imageHeight,
  });
  const [downloadPrice, setDownloadPrice] = useState(String(product?.downloadPrice ?? ""));
  const [customizationEnabled, setCustomizationEnabled] = useState(product?.customizationEnabled ?? false);
  const [customizationPrice, setCustomizationPrice] = useState(String(product?.customizationPrice ?? ""));
  const [published, setPublished] = useState(product?.published ?? true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Pull categories already used by saved resources so manually-added ones persist.
  useEffect(() => {
    let cancelled = false;
    listWealthCategories()
      .then((saved) => {
        if (cancelled || saved.length === 0) return;
        setCategories((current) => {
          const merged = [...current];
          for (const name of saved) {
            if (!merged.some((c) => c.toLowerCase() === name.toLowerCase())) merged.push(name);
          }
          return merged;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const addCategory = () => {
    const name = newCategory.trim().replace(/\s+/g, " ");
    if (!name) return;
    setCategories((current) =>
      current.some((c) => c.toLowerCase() === name.toLowerCase()) ? current : [...current, name],
    );
    setCategory(name);
    setNewCategory("");
    setShowNewCategory(false);
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const asset = await uploadAsset(file, "adventskool/wealth");
      setImageUrl(asset.previewUrl);
      setFileUrl(asset.url);
      setFileType(asset.isPdf ? "pdf" : "image");
      if (asset.isPdf) {
        setDims({ width: asset.width || undefined, height: asset.height || undefined });
        setPageCount(asset.pages || undefined);
      } else {
        const d = await readDimensions(file);
        setDims({ width: d.width || undefined, height: d.height || undefined });
        setPageCount(undefined);
      }
    } catch {
      pushToast("Upload failed. Try again.", "error");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const canManageWealth =
      profile?.role === "admin" ||
      (profile?.role === "teacher" && profile.creatorStatus === "approved" && profile.wealthEnabled);
    if (!profile || !canManageWealth) {
      pushToast("Wealth product access has not been granted to this account.", "error");
      return;
    }
    if (!title.trim() || !imageUrl) {
      pushToast("Add a title and upload the resource image or PDF.", "error");
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
        fileUrl: fileUrl || imageUrl,
        fileType,
        pageCount: fileType === "pdf" ? pageCount : undefined,
        downloadPrice: Number(downloadPrice || 0),
        customizationEnabled,
        customizationPrice: Number(customizationPrice || 0),
        published,
      };
      if (editing && product) {
        await updateWealthProduct(product.id, payload);
        pushToast("Wealth resource updated.", "success");
      } else {
        await createWealthProduct({ ...payload, createdBy: profile.id });
        pushToast("Wealth resource published.", "success");
      }
      router.push(profile.role === "admin" ? "/dashboard/admin/wealth" : "/dashboard/teacher/wealth");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not save wealth resource.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">Wealth Resource Image or PDF</p>
        {imageUrl ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="preview" className="max-h-72 w-auto rounded-lg border border-slate-200" />
            {fileType === "pdf" ? (
              <span className="absolute left-2 top-2 rounded-md bg-rose-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                PDF resource
              </span>
            ) : null}
          </div>
        ) : null}
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 text-sm font-medium text-slate-600 transition hover:border-emerald-400 hover:text-emerald-600">
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          {uploading ? "Uploading…" : imageUrl ? "Replace file" : "Upload resource image or PDF"}
          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
        <p className="text-xs text-slate-500">
          Upload a cover/image (JPG/PNG) or a <span className="font-semibold text-slate-700">PDF resource</span>, including
          an ebook, guide or workbook. PDFs show their first page as the preview and support online reading and download.
        </p>
      </div>

      <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Building Generational Wealth" required />

      <label className="flex w-full flex-col gap-2 text-sm font-medium text-slate-700">
        <span>Description (optional)</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Short description shown on the resource page (good for SEO)."
          className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-emerald-500 transition focus:ring-2"
        />
      </label>

      <div className="flex w-full flex-col gap-2 text-sm font-medium text-slate-700">
        <span>Category</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-emerald-500 transition focus:ring-2"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {showNewCategory ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCategory();
                }
              }}
              placeholder="New category name"
              autoFocus
              className="w-full rounded-md border border-slate-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
            />
            <Button type="button" variant="secondary" onClick={addCategory}>
              Add
            </Button>
            <Button type="button" variant="secondary" onClick={() => { setShowNewCategory(false); setNewCategory(""); }}>
              Cancel
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowNewCategory(true)}
            className="self-start text-xs font-semibold text-emerald-600 hover:text-emerald-700"
          >
            + Add a new category
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Resource Price (Ksh) — optional"
          type="number"
          min="0"
          value={downloadPrice}
          onChange={(e) => setDownloadPrice(e.target.value)}
        />
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium text-slate-700">
            <span>
              <span className="block">Offer personalization</span>
              <span className="block text-xs font-normal text-slate-500">
                Turn on to accept personalized-plan requests for this resource.
              </span>
            </span>
            <input
              type="checkbox"
              checked={customizationEnabled}
              onChange={(e) => setCustomizationEnabled(e.target.checked)}
              className="h-5 w-5 shrink-0 accent-emerald-600"
            />
          </label>
          {customizationEnabled ? (
            <Input
              label="Personalization Fee (Ksh) — optional"
              type="number"
              min="0"
              value={customizationPrice}
              onChange={(e) => setCustomizationPrice(e.target.value)}
            />
          ) : null}
        </div>
      </div>
      <p className="text-xs text-slate-500">
        The resource price is optional. <span className="font-semibold text-slate-700">Leave it empty to make the resource free.</span>
        {customizationEnabled
          ? " The personalization fee is billed separately; leave it empty to accept free requests."
          : " Personalization is off and will not appear anywhere on the public resource pages."}
      </p>

      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
        Publish to the Wealth Academy
      </label>

      <Button type="submit" disabled={submitting || uploading}>
        {submitting ? "Saving…" : editing ? "Save Changes" : "Publish Resource"}
      </Button>
    </form>
  );
}
