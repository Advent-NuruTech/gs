"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import StatusCard from "@/components/ui/StatusCard";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { uploadImage } from "@/lib/cloudinary/uploadImage";

interface ServeGalleryImage {
  id: string;
  image_url: string;
  caption: string;
  sort_order: number;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "The request could not be completed.");
  return payload as T;
}

function ServeGalleryImageEditor({
  image,
  onSaved,
  onDelete,
  deleting,
}: {
  image: ServeGalleryImage;
  onSaved: (image: ServeGalleryImage) => void;
  onDelete: (image: ServeGalleryImage) => void;
  deleting: boolean;
}) {
  const [caption, setCaption] = useState(image.caption);
  const saveAction = useAsyncAction({
    action: async () => requestJson<{ image: ServeGalleryImage }>("/api/serve/gallery", {
      method: "PATCH",
      body: JSON.stringify({ id: image.id, caption }),
    }),
    successMessage: "Caption updated.",
    onSuccess: (result) => {
      setCaption(result.image.caption);
      onSaved(result.image);
    },
  });

  return (
    <article className="grid min-w-0 gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-[10rem_minmax(0,1fr)]">
      {/* Administrator-uploaded images are public Cloudinary assets. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.image_url} alt={image.caption} className="aspect-[4/3] w-full bg-slate-100 object-contain dark:bg-slate-950" />
      <div className="min-w-0 space-y-3">
        <Input label="Image caption" required maxLength={500} value={caption} onChange={(event) => { setCaption(event.target.value); saveAction.reset(); }} />
        {saveAction.successMessage ? <StatusCard kind="success" title={saveAction.successMessage} /> : null}
        {saveAction.errorMessage ? <StatusCard kind="error" title="Caption not saved" description={saveAction.errorMessage} /> : null}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            loading={saveAction.isLoading}
            loadingText="Saving..."
            disabled={!caption.trim() || caption.trim() === image.caption}
            onClick={() => void saveAction.run()}
          >
            Save caption
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={deleting}
            disabled={deleting}
            onClick={() => {
              if (window.confirm("Remove this image from the public SERVE gallery?")) onDelete(image);
            }}
          >
            <Trash2 className="h-4 w-4" />Remove image
          </Button>
        </div>
      </div>
    </article>
  );
}

export default function ServeGalleryManager() {
  const [images, setImages] = useState<ServeGalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [cleanupWarning, setCleanupWarning] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const result = await requestJson<{ images: ServeGalleryImage[] }>("/api/serve/gallery");
      setImages(result.images);
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : "Could not load the SERVE image gallery.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  const uploadAction = useAsyncAction({
    action: async () => {
      if (!file) throw new Error("Choose an image to upload.");
      if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
      if (file.size > 10 * 1024 * 1024) throw new Error("Choose an image no larger than 10 MB.");
      if (!caption.trim()) throw new Error("Enter a caption for this image.");

      const imageUrl = await uploadImage(file, "adventskool/serve-gallery");
      return requestJson<{ image: ServeGalleryImage }>("/api/serve/gallery", {
        method: "POST",
        body: JSON.stringify({ image_url: imageUrl, caption }),
      });
    },
    successMessage: "Image added to the public SERVE gallery.",
    onSuccess: async () => {
      setFile(null);
      setCaption("");
      await reload();
    },
  });

  const deleteAction = useAsyncAction({
    action: (image: ServeGalleryImage) => requestJson<{ cleanupWarning?: string }>("/api/serve/gallery", {
      method: "DELETE",
      body: JSON.stringify({ id: image.id }),
    }),
    successMessage: "Image removed from the public gallery.",
    onSuccess: async (result) => {
      setCleanupWarning(result.cleanupWarning ?? "");
      await reload();
    },
  });

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null);
    uploadAction.reset();
  };

  const addImage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCleanupWarning("");
    void uploadAction.run();
  };

  return (
    <section className="space-y-5 border-t border-slate-200 pt-7 dark:border-slate-700" aria-labelledby="serve-gallery-heading">
      <div>
        <h2 id="serve-gallery-heading" className="text-xl font-bold text-slate-950 dark:text-white">SERVE landing page images</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">Add as many images as you need. They fade between images every five seconds; each caption can be edited or an image removed.</p>
      </div>
      <form onSubmit={addImage} className="grid min-w-0 gap-4 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30 sm:grid-cols-2">
        <label className="flex min-w-0 cursor-pointer flex-col justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white p-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <span className="inline-flex items-center gap-2"><ImagePlus className="h-5 w-5" />{file?.name ?? "Choose gallery image"}</span>
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Image files up to 10 MB. Images display without a shadow or text overlay.</span>
          <input type="file" accept="image/*" className="sr-only" onChange={handleFile} disabled={uploadAction.isLoading} />
        </label>
        <div className="space-y-3">
          <Input label="Image caption" required maxLength={500} value={caption} onChange={(event) => { setCaption(event.target.value); uploadAction.reset(); }} />
          {uploadAction.isLoading ? <StatusCard kind="loading" title="Uploading SERVE image" description="The image will be added to the public carousel when it is stored." /> : null}
          {uploadAction.successMessage ? <StatusCard kind="success" title={uploadAction.successMessage} /> : null}
          {uploadAction.errorMessage ? <StatusCard kind="error" title="Image could not be added" description={uploadAction.errorMessage} /> : null}
          <Button type="submit" loading={uploadAction.isLoading} loadingText="Uploading..." disabled={!file || !caption.trim()}>
            <ImagePlus className="h-4 w-4" />Add image
          </Button>
        </div>
      </form>

      {deleteAction.isLoading ? <StatusCard kind="loading" title="Removing gallery image" /> : null}
      {deleteAction.successMessage ? <StatusCard kind="success" title={deleteAction.successMessage} /> : null}
      {deleteAction.errorMessage ? <StatusCard kind="error" title="Image could not be removed" description={deleteAction.errorMessage} /> : null}
      {cleanupWarning ? <StatusCard kind="warning" title={cleanupWarning} /> : null}
      {loading ? <StatusCard kind="loading" title="Loading SERVE gallery images" /> : null}
      {loadError ? <StatusCard kind="error" title="SERVE gallery could not be loaded" description={loadError} actions={<Button size="sm" onClick={() => void reload()}>Retry</Button>} /> : null}
      {!loading && !loadError && images.length === 0 ? <StatusCard kind="info" title="No custom images yet" description="The public page will show its default invitation image until you add images." /> : null}
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        {images.map((image) => (
          <ServeGalleryImageEditor
            key={image.id}
            image={image}
            onSaved={(saved) => setImages((current) => current.map((item) => item.id === saved.id ? saved : item))}
            onDelete={(selected) => { setCleanupWarning(""); void deleteAction.run(selected); }}
            deleting={deleteAction.isLoading}
          />
        ))}
      </div>
    </section>
  );
}
