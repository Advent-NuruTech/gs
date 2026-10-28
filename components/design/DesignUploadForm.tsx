"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import StatusCard from "@/components/ui/StatusCard";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import { bindProductAssets, uploadAsset } from "@/lib/cloudflare/uploadAsset";
import { createDesign, listDesignCategories, updateDesign } from "@/services/designService";
import { Design, DesignDeliveryMode, DesignFileType, DESIGN_CATEGORIES } from "@/types/design";

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
  // Category list starts from the presets; admins can add their own on the fly
  // and it joins the dropdown immediately (and the public filter once published).
  const [categories, setCategories] = useState<string[]>(() => {
    const base = [...DESIGN_CATEGORIES] as string[];
    if (design?.category && !base.some((c) => c.toLowerCase() === design.category.toLowerCase())) {
      base.unshift(design.category);
    }
    return base;
  });
  const [newCategory, setNewCategory] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [imageUrl, setImageUrl] = useState(design?.imageUrl ?? "");
  const [fileUrl, setFileUrl] = useState(design?.fileUrl ?? design?.imageUrl ?? "");
  const [fileType, setFileType] = useState<DesignFileType>(design?.fileType ?? "image");
  const [pageCount, setPageCount] = useState<number | undefined>(design?.pageCount);
  const [deliveryMode, setDeliveryMode] = useState<DesignDeliveryMode>(design?.deliveryMode ?? "download");
  const [dims, setDims] = useState<{ width?: number; height?: number }>({
    width: design?.imageWidth,
    height: design?.imageHeight,
  });
  const [downloadPrice, setDownloadPrice] = useState(String(design?.downloadPrice ?? ""));
  const [customizationEnabled, setCustomizationEnabled] = useState(design?.customizationEnabled ?? true);
  const [customizationPrice, setCustomizationPrice] = useState(String(design?.customizationPrice ?? ""));
  const [published, setPublished] = useState(design?.published ?? true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Pull categories already used by saved designs so manually-added ones persist
  // across reloads instead of disappearing behind the hardcoded presets.
  useEffect(() => {
    let cancelled = false;
    listDesignCategories()
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
    setUploadError("");
    try {
      const asset = await uploadAsset(file, "adventskool/designs", "deliverable");
      setFileUrl(asset.url);
      setFileType(asset.isPdf ? "pdf" : "image");
      if (asset.isPdf) {
        setPageCount(asset.pages || undefined);
      } else {
        setPageCount(undefined);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed. Try again.";
      setUploadError(message);
      pushToast(message, "error");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleCoverUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const asset = await uploadAsset(file, "adventskool/designs", "product_image");
      const d = await readDimensions(file);
      setImageUrl(asset.url);
      setDims({ width: d.width || undefined, height: d.height || undefined });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cover upload failed. Try again.";
      setUploadError(message);
      pushToast(message, "error");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile || (profile.role !== "admin" && profile.role !== "teacher")) {
      pushToast("Creator or administrator access is required to manage digital products.", "error");
      return;
    }
    if (!title.trim() || !imageUrl || !fileUrl) {
      pushToast("Add a title, cover image, and product file.", "error");
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
        deliveryMode,
        downloadPrice: Number(downloadPrice || 0),
        customizationEnabled,
        customizationPrice: Number(customizationPrice || 0),
        published,
      };
      let savedId: string;
      if (editing && design) {
        await updateDesign(design.id, payload);
        savedId = design.id;
        pushToast("Digital product updated.", "success");
      } else {
        savedId = await createDesign({ ...payload, createdBy: profile.id });
        pushToast("Digital product published.", "success");
      }
      try {
        await bindProductAssets("design", savedId, [imageUrl, fileUrl || imageUrl]);
      } catch {
        pushToast("Product saved, but its storage metadata link is pending. Open and save it again after checking Cloudflare.", "info");
      }
      router.push(
        profile.role === "teacher"
          ? profile.handle
            ? `/@${profile.handle}`
            : "/dashboard/teacher/storefront"
          : "/dashboard/admin/designs",
      );
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not save digital product.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Digital Product Cover</p>
        {imageUrl ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="preview" className="max-h-72 w-auto rounded-lg border border-slate-200" />
          </div>
        ) : null}
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 text-sm font-medium text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600">
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          {uploading ? "Uploading…" : imageUrl ? "Replace cover image" : "Upload cover image"}
          <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={uploading} />
        </label>
        <p className="text-xs text-slate-500">
          This public image is shown in the marketplace. The original product file stays private until access is granted.
        </p>
        <p className="pt-2 text-sm font-medium text-slate-700 dark:text-slate-200">Product File</p>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 text-sm font-medium text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          {uploading ? "Uploading…" : fileUrl ? `Replace ${fileType === "pdf" ? "PDF" : "product file"}` : "Upload product file"}
          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
        <p className="text-xs text-slate-500">Upload the image or PDF customers will receive or read online.</p>
        {uploadError ? <StatusCard kind="error" title="Upload failed" description={uploadError} /> : null}
      </div>

      <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Bold Tech Review Thumbnail" required />

      <label className="flex w-full flex-col gap-2 text-sm font-medium text-slate-700">
        <span>Description (optional)</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Short description shown on the product page (good for SEO)."
          className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-blue-500 transition focus:ring-2"
        />
      </label>

      <div className="flex w-full flex-col gap-2 text-sm font-medium text-slate-700">
        <span>Category</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-blue-500 transition focus:ring-2"
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
              className="w-full rounded-md border border-slate-300 px-3 py-2 font-normal outline-none ring-blue-500 transition focus:ring-2"
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
            className="self-start text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            + Add a new category
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Product Price (Ksh) — optional"
          type="number"
          min="0"
          value={downloadPrice}
          onChange={(e) => setDownloadPrice(e.target.value)}
        />
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium text-slate-700">
            <span>
              <span className="block">Offer customization</span>
              <span className="block text-xs font-normal text-slate-500">
                Turn off to hide customization from customers.
              </span>
            </span>
            <input
              type="checkbox"
              checked={customizationEnabled}
              onChange={(e) => setCustomizationEnabled(e.target.checked)}
              className="h-5 w-5 shrink-0 accent-indigo-600"
            />
          </label>
          {customizationEnabled ? (
            <Input
              label="Customization Fee (Ksh) — optional"
              type="number"
              min="0"
              value={customizationPrice}
              onChange={(e) => setCustomizationPrice(e.target.value)}
            />
          ) : null}
        </div>
      </div>
      <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <legend className="px-1 text-sm font-semibold text-slate-800 dark:text-slate-100">Customer access</legend>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 dark:border-slate-700 dark:has-[:checked]:border-indigo-400 dark:has-[:checked]:bg-indigo-950/50">
          <input
            type="radio"
            name="deliveryMode"
            value="download"
            checked={deliveryMode === "download"}
            onChange={() => setDeliveryMode("download")}
            className="mt-0.5 h-4 w-4 accent-indigo-600"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">Allow download</span>
            <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">Customers may download the original product file or read it online.</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 dark:border-slate-700 dark:has-[:checked]:border-indigo-400 dark:has-[:checked]:bg-indigo-950/50">
          <input
            type="radio"
            name="deliveryMode"
            value="online_only"
            checked={deliveryMode === "online_only"}
            onChange={() => setDeliveryMode("online_only")}
            className="mt-0.5 h-4 w-4 accent-indigo-600"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">Online only</span>
            <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">Customers must sign in and can use the protected reader, but cannot download through AdventSkool.</span>
          </span>
        </label>
        <p className="text-xs text-slate-500 dark:text-slate-400">Online-only access blocks file downloads from AdventSkool. As with any content shown in a browser, it cannot prevent screenshots or copying visible material.</p>
      </fieldset>
      <p className="text-xs text-slate-500">
        The product price is optional. <span className="font-semibold text-slate-700">Leave it empty to make the product free.</span>
        {customizationEnabled
          ? " The customization fee is billed separately; leave it empty to accept free customization requests."
          : " Customization is off and will not appear anywhere on the public product pages."}
      </p>

      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
        Publish to the digital products marketplace
      </label>

      <Button type="submit" disabled={submitting || uploading}>
        {submitting ? "Saving…" : editing ? "Save Changes" : "Publish Product"}
      </Button>
    </form>
  );
}
