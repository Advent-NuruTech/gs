"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import { uploadAsset } from "@/lib/cloudinary/uploadImage";
import { createDesign, listDesignCategories, updateDesign } from "@/services/designService";
import { Design, DesignFileType, DESIGN_CATEGORIES } from "@/types/design";

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
  const [dims, setDims] = useState<{ width?: number; height?: number }>({
    width: design?.imageWidth,
    height: design?.imageHeight,
  });
  const [downloadPrice, setDownloadPrice] = useState(String(design?.downloadPrice ?? ""));
  const [customizationPrice, setCustomizationPrice] = useState(String(design?.customizationPrice ?? ""));
  const [published, setPublished] = useState(design?.published ?? true);
  const [uploading, setUploading] = useState(false);
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
    try {
      const asset = await uploadAsset(file, "adventskool/designs");
      setImageUrl(asset.previewUrl);
      setFileUrl(asset.url);
      setFileType(asset.isPdf ? "pdf" : "image");
      if (asset.isPdf) {
        // PDFs report their page dimensions + total page count in the response.
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
    if (!profile || profile.role !== "admin") {
      pushToast("Only admins can manage designs.", "error");
      return;
    }
    if (!title.trim() || !imageUrl) {
      pushToast("Add a title and upload the design image or PDF.", "error");
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
        <p className="text-sm font-medium text-slate-700">Design Image or PDF Template</p>
        {imageUrl ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="preview" className="max-h-72 w-auto rounded-lg border border-slate-200" />
            {fileType === "pdf" ? (
              <span className="absolute left-2 top-2 rounded-md bg-rose-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                PDF template
              </span>
            ) : null}
          </div>
        ) : null}
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 text-sm font-medium text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600">
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          {uploading ? "Uploading…" : imageUrl ? "Replace file" : "Upload design image or PDF"}
          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
        <p className="text-xs text-slate-500">
          Upload a flat image (JPG/PNG) or a <span className="font-semibold text-slate-700">PDF template</span>. PDFs show
          their first page as the gallery preview and the full PDF is delivered on download.
        </p>
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
          label="Download Price (Ksh) — optional"
          type="number"
          min="0"
          value={downloadPrice}
          onChange={(e) => setDownloadPrice(e.target.value)}
        />
        <Input
          label="Customization Fee (Ksh) — optional"
          type="number"
          min="0"
          value={customizationPrice}
          onChange={(e) => setCustomizationPrice(e.target.value)}
        />
      </div>
      <p className="text-xs text-slate-500">
        Both prices are optional and billed separately. <span className="font-semibold text-slate-700">Leave a field
        empty to make it free</span> — a free download is delivered instantly with no payment, and a free customization
        request is submitted without forcing the customer to pay. Set an amount only when you want to charge for it.
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
