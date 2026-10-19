"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import Link from "next/link";
import { Copy, ExternalLink, ImagePlus, Trash2 } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageSkeleton from "@/components/ui/PageSkeleton";
import StatusCard from "@/components/ui/StatusCard";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useAsyncData } from "@/hooks/useAsyncData";
import { apiRequest } from "@/lib/api/client";
import { uploadImage } from "@/lib/cloudinary/uploadImage";
import { CREATOR_SOCIAL_PLATFORMS } from "@/lib/creators/validation";
import { CreatorDomainRequest, CreatorSocialLinks, CreatorStorefrontProfile } from "@/types/creator";

type StorefrontResponse = { profile: CreatorStorefrontProfile };
type DomainsResponse = { requests: CreatorDomainRequest[] };

const socialLabels: Record<keyof CreatorSocialLinks, string> = {
  website: "Website",
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  x: "X",
  tiktok: "TikTok",
};

const statusLabels: Record<CreatorDomainRequest["status"], string> = {
  pending: "Awaiting review",
  in_progress: "Setup in progress",
  awaiting_dns: "Waiting for DNS",
  ready: "Ready",
  rejected: "Not approved",
  cancelled: "Cancelled",
};

function CreatorStorefrontEditor({ initialProfile }: { initialProfile: CreatorStorefrontProfile }) {
  const domainData = useAsyncData(() => apiRequest<DomainsResponse>("/api/creator/domains"), []);
  const [name, setName] = useState(initialProfile.name ?? "");
  const [handle, setHandle] = useState(initialProfile.handle ?? "");
  const [photoUrl, setPhotoUrl] = useState(initialProfile.photoUrl ?? "");
  const [bio, setBio] = useState(initialProfile.bio ?? "");
  const [socialLinks, setSocialLinks] = useState<CreatorSocialLinks>(initialProfile.socialLinks ?? {});
  const [requestedDomain, setRequestedDomain] = useState("");
  const [photoValidation, setPhotoValidation] = useState("");

  const saveAction = useAsyncAction({
    action: () => apiRequest<StorefrontResponse>("/api/creator/storefront", {
      method: "PATCH",
      body: JSON.stringify({ name, handle, photoUrl, bio, socialLinks }),
    }),
    successMessage: "Your creator storefront has been updated.",
    onSuccess: (result) => {
      setHandle(result.profile.handle);
    },
  });

  const uploadAction = useAsyncAction({
    action: (file: File) => uploadImage(file, "adventskool/creator-profiles"),
    successMessage: "Profile picture uploaded. Save your storefront to publish it.",
    onSuccess: setPhotoUrl,
  });

  const domainAction = useAsyncAction({
    action: () => apiRequest<{ request: CreatorDomainRequest }>("/api/creator/domains", {
      method: "POST",
      body: JSON.stringify({ domain: requestedDomain }),
    }),
    successMessage: "Your custom-domain request was submitted. We will notify you when it is ready.",
    onSuccess: () => {
      setRequestedDomain("");
      domainData.reload();
    },
  });

  const handlePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoValidation("Choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoValidation("Profile pictures must be 5 MB or smaller.");
      return;
    }
    setPhotoValidation("");
    void uploadAction.run(file);
  };

  const publicPath = handle ? `/@${handle}` : "";
  const activeRequest = domainData.data?.requests.find((request) => !["rejected", "cancelled"].includes(request.status));

  return (
    <section className="mx-auto max-w-5xl space-y-8">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Creator profile</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">Your storefront</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Everything except your name is optional. Empty details are not shown publicly.</p>
        </div>
        {publicPath ? <Link href={publicPath} target="_blank" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white">View storefront <ExternalLink className="h-4 w-4" /></Link> : null}
      </div>

      <form className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6" onSubmit={(event: FormEvent) => { event.preventDefault(); void saveAction.run(); }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="Current creator profile" className="h-28 w-28 rounded-full border border-slate-200 object-cover dark:border-slate-700" />
          ) : null}
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              <ImagePlus className="h-4 w-4" /> {photoUrl ? "Replace picture" : "Add profile picture"}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} disabled={uploadAction.isLoading} />
            </label>
            {photoUrl ? <Button variant="secondary" onClick={() => setPhotoUrl("")}><Trash2 className="h-4 w-4" />Remove</Button> : null}
          </div>
        </div>
        {uploadAction.isLoading ? <StatusCard kind="loading" title="Uploading profile picture" /> : null}
        {photoValidation ? <StatusCard kind="error" title="Picture not selected" description={photoValidation} /> : null}
        {uploadAction.successMessage ? <StatusCard kind="success" title="Picture uploaded" description={uploadAction.successMessage} /> : null}
        {uploadAction.errorMessage ? <StatusCard kind="error" title="Picture upload failed" description={uploadAction.errorMessage} /> : null}

        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <Input label="Creator name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required />
          <Input label="Handle (optional)" value={handle} onChange={(event) => setHandle(event.target.value)} hint="Lowercase letters, numbers and hyphens. Leave it unchanged to keep your current link." maxLength={30} />
        </div>
        {publicPath ? (
          <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-950 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-100 sm:flex-row sm:items-center sm:justify-between">
            <span className="min-w-0 break-all text-sm font-semibold">https://adventskool.co.ke{publicPath}</span>
            <Button type="button" variant="secondary" onClick={() => void navigator.clipboard.writeText(`https://adventskool.co.ke${publicPath}`)}><Copy className="h-4 w-4" />Copy</Button>
          </div>
        ) : null}
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
          Bio (optional)
          <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={500} rows={5} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{bio.length}/500</span>
        </label>
        <div className="space-y-3">
          <h2 className="font-semibold text-slate-950 dark:text-white">Social links (optional)</h2>
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            {CREATOR_SOCIAL_PLATFORMS.map((platform) => <Input key={platform} label={socialLabels[platform]} type="url" value={socialLinks[platform] ?? ""} onChange={(event) => setSocialLinks((current) => ({ ...current, [platform]: event.target.value }))} />)}
          </div>
        </div>
        {saveAction.successMessage ? <StatusCard kind="success" title="Storefront saved" description={saveAction.successMessage} /> : null}
        {saveAction.errorMessage ? <StatusCard kind="error" title="Storefront could not be saved" description={saveAction.errorMessage} /> : null}
        <Button type="submit" loading={saveAction.isLoading} loadingText="Saving storefront…">Save storefront</Button>
      </form>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div><h2 className="text-xl font-bold text-slate-950 dark:text-white">Request a custom domain</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Tell us the domain you own. The AdventSkool team will configure and verify it, then notify you when it is ready.</p></div>
        {domainData.isLoading ? <StatusCard kind="loading" title="Checking domain requests" /> : null}
        {domainData.errorMessage ? <StatusCard kind="error" title="Domain requests could not be loaded" description={domainData.errorMessage} actions={<Button onClick={domainData.reload}>Retry</Button>} /> : null}
        {activeRequest ? <StatusCard kind={activeRequest.status === "ready" ? "success" : "info"} title={`${activeRequest.requestedDomain}: ${statusLabels[activeRequest.status]}`} description={activeRequest.status === "ready" ? "Your custom storefront address is ready." : "We will notify you in AdventSkool when the status changes."} /> : (
          <form className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(event) => { event.preventDefault(); void domainAction.run(); }}>
            <Input label="Domain you own" value={requestedDomain} onChange={(event) => setRequestedDomain(event.target.value)} className="min-w-0" required />
            <Button type="submit" loading={domainAction.isLoading} loadingText="Submitting…" className="shrink-0">Submit request</Button>
          </form>
        )}
        {domainAction.successMessage ? <StatusCard kind="success" title="Request received" description={domainAction.successMessage} /> : null}
        {domainAction.errorMessage ? <StatusCard kind="error" title="Request could not be submitted" description={domainAction.errorMessage} /> : null}
      </section>
    </section>
  );
}

export default function CreatorStorefrontSettingsPage() {
  const storefrontData = useAsyncData(() => apiRequest<StorefrontResponse>("/api/creator/storefront"), []);
  if (storefrontData.isLoading) return <PageSkeleton label="Loading creator storefront settings" />;
  if (storefrontData.errorMessage || !storefrontData.data) {
    return <StatusCard kind="error" title="Storefront could not be loaded" description={storefrontData.errorMessage || "Creator profile not found."} actions={<Button onClick={storefrontData.reload}>Retry</Button>} />;
  }
  return <CreatorStorefrontEditor key={`${storefrontData.data.profile.id}:${storefrontData.data.profile.handle}`} initialProfile={storefrontData.data.profile} />;
}
