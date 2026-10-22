"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { ArrowRight, ImagePlus, Images, Trash2 } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageSkeleton from "@/components/ui/PageSkeleton";
import StatusCard from "@/components/ui/StatusCard";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { uploadImage } from "@/lib/cloudinary/uploadImage";
import {
  createHomeHeroSlide,
  deleteHomeHeroSlide,
  getHomeHeroContent,
  updateHomeHeroSettings,
} from "@/services/homeHeroService";
import { HomeHeroContent, HomeHeroSlide, isSafeHeroHref } from "@/types/hero";

const MAX_SLIDES = 10;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      reject(new Error("The selected image could not be read."));
      URL.revokeObjectURL(url);
    };
    image.src = url;
  });
}

async function validateHeroImage(file: File, variant: "desktop" | "mobile") {
  if (!file.type.startsWith("image/")) throw new Error("Choose image files for both hero versions.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Each hero image must be 10 MB or smaller.");

  const size = await readImageSize(file);
  const ratio = size.width / size.height;
  if (variant === "desktop" && (size.width < 1600 || size.height < 600 || ratio < 2.2 || ratio > 3.5)) {
    throw new Error("The desktop image must be at least 1600×600 and use a wide 2.2:1 to 3.5:1 composition.");
  }
  if (variant === "mobile" && (size.width < 1000 || size.height < 750 || ratio < 1.2 || ratio > 1.5)) {
    throw new Error("The mobile image must be at least 1000×750 and close to a 4:3 composition.");
  }
}

function HeroAdminEditor({ initialContent, reload }: { initialContent: HomeHeroContent; reload: () => void }) {
  const [slides, setSlides] = useState(initialContent.slides);
  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
  const [primaryLabel, setPrimaryLabel] = useState(initialContent.settings.primaryCtaLabel);
  const [primaryHref, setPrimaryHref] = useState(initialContent.settings.primaryCtaHref);
  const [secondaryLabel, setSecondaryLabel] = useState(initialContent.settings.secondaryCtaLabel);
  const [secondaryHref, setSecondaryHref] = useState(initialContent.settings.secondaryCtaHref);

  const uploadAction = useAsyncAction({
    action: async () => {
      if (slides.length >= MAX_SLIDES) throw new Error("The hero already has the maximum of 10 slides.");
      if (!desktopFile || !mobileFile) throw new Error("Choose both a desktop and mobile image.");
      if (!altText.trim()) throw new Error("Add short alternative text describing the image.");
      await Promise.all([
        validateHeroImage(desktopFile, "desktop"),
        validateHeroImage(mobileFile, "mobile"),
      ]);
      const [desktopImageUrl, mobileImageUrl] = await Promise.all([
        uploadImage(desktopFile, "adventskool/homepage-hero/desktop"),
        uploadImage(mobileFile, "adventskool/homepage-hero/mobile"),
      ]);
      const sortOrder = Math.max(0, ...slides.map((slide) => slide.sortOrder)) + 10;
      return createHomeHeroSlide({ desktopImageUrl, mobileImageUrl, altText: altText.trim(), sortOrder });
    },
    successMessage: "The new hero slide is live.",
    onSuccess: (slide) => {
      setSlides((current) => [...current, slide]);
      setDesktopFile(null);
      setMobileFile(null);
      setAltText("");
      reload();
    },
  });

  const deleteAction = useAsyncAction({
    action: (slide: HomeHeroSlide) => deleteHomeHeroSlide(slide),
    successMessage: "The hero slide was deleted.",
    onSuccess: () => reload(),
  });

  const settingsAction = useAsyncAction({
    action: () => updateHomeHeroSettings({
      primaryCtaLabel: primaryLabel,
      primaryCtaHref: primaryHref,
      secondaryCtaLabel: secondaryLabel,
      secondaryCtaHref: secondaryHref,
    }),
    successMessage: "Hero actions updated.",
    onSuccess: (settings) => {
      setPrimaryLabel(settings.primaryCtaLabel);
      setPrimaryHref(settings.primaryCtaHref);
      setSecondaryLabel(settings.secondaryCtaLabel);
      setSecondaryHref(settings.secondaryCtaHref);
      reload();
    },
  });

  const handleFile = (event: ChangeEvent<HTMLInputElement>, variant: "desktop" | "mobile") => {
    const file = event.target.files?.[0] ?? null;
    if (variant === "desktop") setDesktopFile(file);
    else setMobileFile(file);
    uploadAction.reset();
  };

  const ctaInvalid = !primaryLabel.trim() || !secondaryLabel.trim() || !isSafeHeroHref(primaryHref.trim()) || !isSafeHeroHref(secondaryHref.trim());
  const ctaUnchanged = primaryLabel === initialContent.settings.primaryCtaLabel
    && primaryHref === initialContent.settings.primaryCtaHref
    && secondaryLabel === initialContent.settings.secondaryCtaLabel
    && secondaryHref === initialContent.settings.secondaryCtaHref;

  return (
    <section className="mx-auto max-w-6xl space-y-8">
      <div className="flex min-w-0 items-center gap-3">
        <span className="shrink-0 rounded-xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><Images className="h-6 w-6" /></span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Homepage hero</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">Manage up to ten responsive hero images and both actions shown over them.</p>
        </div>
      </div>

      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div>
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">Hero action buttons</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">These two buttons appear over every hero image. Use an internal path such as /courses or a full https:// link.</p>
        </div>
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <Input label="First button label" value={primaryLabel} onChange={(event) => { setPrimaryLabel(event.target.value); settingsAction.reset(); }} maxLength={40} />
          <Input label="First button destination" value={primaryHref} onChange={(event) => { setPrimaryHref(event.target.value); settingsAction.reset(); }} maxLength={500} error={primaryHref && !isSafeHeroHref(primaryHref.trim()) ? "Use /path or a full https:// URL." : undefined} />
          <Input label="Second button label" value={secondaryLabel} onChange={(event) => { setSecondaryLabel(event.target.value); settingsAction.reset(); }} maxLength={40} />
          <Input label="Second button destination" value={secondaryHref} onChange={(event) => { setSecondaryHref(event.target.value); settingsAction.reset(); }} maxLength={500} error={secondaryHref && !isSafeHeroHref(secondaryHref.trim()) ? "Use /path or a full https:// URL." : undefined} />
        </div>
        {settingsAction.isLoading ? <StatusCard kind="loading" title="Saving hero actions" /> : null}
        {settingsAction.successMessage ? <StatusCard kind="success" title={settingsAction.successMessage} /> : null}
        {settingsAction.errorMessage ? <StatusCard kind="error" title="Hero actions could not be saved" description={settingsAction.errorMessage} /> : null}
        <Button onClick={() => void settingsAction.run()} loading={settingsAction.isLoading} loadingText="Saving actions…" disabled={ctaInvalid || ctaUnchanged}>Save hero actions</Button>
      </section>

      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">Upload a hero slide</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Upload both compositions to keep the image sharp and properly framed on every screen.</p>
          </div>
          <span className="shrink-0 text-sm font-bold text-blue-700 dark:text-blue-300">{slides.length}/{MAX_SLIDES} slides</span>
        </div>

        {slides.length >= MAX_SLIDES ? <StatusCard kind="warning" title="Hero library is full" description="Delete a slide before uploading another. The carousel supports up to ten." /> : (
          <form className="space-y-4" onSubmit={(event: FormEvent) => { event.preventDefault(); void uploadAction.run(); }}>
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <label className="flex min-w-0 cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 p-5 text-center text-sm font-semibold text-slate-700 transition hover:border-blue-500 hover:text-blue-700 dark:border-slate-700 dark:text-slate-200">
                <ImagePlus className="h-6 w-6" />
                <span>{desktopFile?.name ?? "Choose desktop image"}</span>
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">At least 1600×600, wide 2.2:1–3.5:1, maximum 10 MB</span>
                <input key={desktopFile?.name ?? "desktop-empty"} type="file" accept="image/*" className="hidden" onChange={(event) => handleFile(event, "desktop")} disabled={uploadAction.isLoading} />
              </label>
              <label className="flex min-w-0 cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 p-5 text-center text-sm font-semibold text-slate-700 transition hover:border-blue-500 hover:text-blue-700 dark:border-slate-700 dark:text-slate-200">
                <ImagePlus className="h-6 w-6" />
                <span>{mobileFile?.name ?? "Choose mobile image"}</span>
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">At least 1000×750, approximately 4:3, maximum 10 MB</span>
                <input key={mobileFile?.name ?? "mobile-empty"} type="file" accept="image/*" className="hidden" onChange={(event) => handleFile(event, "mobile")} disabled={uploadAction.isLoading} />
              </label>
            </div>
            <Input label="Image description" hint="Briefly describe the person and activity for screen readers." value={altText} onChange={(event) => { setAltText(event.target.value); uploadAction.reset(); }} maxLength={180} required />
            {uploadAction.isLoading ? <StatusCard kind="loading" title="Uploading both hero images" description="The new slide will appear when both high-quality versions are safely stored." /> : null}
            {uploadAction.successMessage ? <StatusCard kind="success" title={uploadAction.successMessage} /> : null}
            {uploadAction.errorMessage ? <StatusCard kind="error" title="Hero slide could not be uploaded" description={uploadAction.errorMessage} /> : null}
            <Button type="submit" loading={uploadAction.isLoading} loadingText="Uploading slide…" disabled={!desktopFile || !mobileFile || !altText.trim()}><ImagePlus className="h-4 w-4" />Add hero slide</Button>
          </form>
        )}
      </section>

      <section className="space-y-4">
        <div><h2 className="text-xl font-bold text-slate-950 dark:text-white">Current slides</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Slides rotate in this order every 6.5 seconds. Upload a replacement before deleting the final slide.</p></div>
        {deleteAction.isLoading ? <StatusCard kind="loading" title="Deleting hero slide" /> : null}
        {deleteAction.successMessage ? <StatusCard kind="success" title={deleteAction.successMessage} /> : null}
        {deleteAction.errorMessage ? <StatusCard kind="error" title="Hero slide could not be deleted" description={deleteAction.errorMessage} /> : null}
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          {slides.map((slide, index) => (
            <article key={slide.id} className="min-w-0 overflow-hidden border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="grid grid-cols-[minmax(0,1fr)_7rem] bg-slate-100 dark:bg-slate-950">
                {/* Hero images can be local defaults or administrator-configured Cloudinary assets. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slide.desktopImageUrl} alt="" className="aspect-[3/1] h-full w-full object-cover" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slide.mobileImageUrl} alt="" className="aspect-[4/3] h-full w-full border-l border-white/50 object-cover" />
              </div>
              <div className="flex min-w-0 items-start justify-between gap-3 p-4">
                <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">Slide {index + 1}</p><p className="mt-1 break-words text-sm text-slate-700 dark:text-slate-200">{slide.altText}</p></div>
                <Button
                  variant="danger"
                  size="sm"
                  loading={deleteAction.isLoading}
                  disabled={slides.length <= 1}
                  onClick={() => {
                    if (window.confirm("Delete this hero slide? This cannot be undone.")) void deleteAction.run(slide);
                  }}
                >
                  <Trash2 className="h-4 w-4" />Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <a href="/" target="_blank" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-800 dark:text-blue-300">Preview homepage <ArrowRight className="h-4 w-4" /></a>
    </section>
  );
}

export default function HomepageHeroAdminPage() {
  const guard = useRoleGuard(["admin"]);
  const heroData = useAsyncData(getHomeHeroContent, [guard.isAllowed]);

  if (guard.loading || heroData.isLoading || !guard.isAllowed) return <PageSkeleton label="Loading homepage hero manager" variant="form" />;
  if (heroData.errorMessage || !heroData.data) {
    return <StatusCard kind="error" title="Homepage hero could not be loaded" description={heroData.errorMessage || "No hero configuration was returned."} actions={<Button onClick={heroData.reload}>Try again</Button>} />;
  }

  const editorKey = `${heroData.data.slides.map((slide) => slide.id).join(":")}:${heroData.data.settings.primaryCtaLabel}:${heroData.data.settings.secondaryCtaLabel}`;
  return <HeroAdminEditor key={editorKey} initialContent={heroData.data} reload={heroData.reload} />;
}
