import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import CreatorProfile from "@/components/creator/CreatorProfile";
import { getCreatorStorefront } from "@/lib/creators/server";

export const dynamic = "force-dynamic";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://adventskool.co.ke").replace(/\/$/, "");

function parseHandle(segment: string) {
  const decoded = decodeURIComponent(segment);
  return decoded.startsWith("@") ? decoded.slice(1).toLowerCase() : null;
}

export async function generateMetadata({ params }: { params: Promise<{ creatorHandle: string }> }): Promise<Metadata> {
  const { creatorHandle } = await params;
  const handle = parseHandle(creatorHandle);
  if (!handle) return {};
  const creator = await getCreatorStorefront(handle);
  if (!creator) return {};
  const title = `${creator.name}'s profile | AdventSkool`;
  const description = creator.bio ?? `Learn more about ${creator.name}, a creator on AdventSkool.`;
  const url = `${siteUrl}/@${creator.handle}/profile`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "profile", images: creator.photoUrl ? [creator.photoUrl] : undefined },
  };
}

export default async function CreatorProfilePage({ params }: { params: Promise<{ creatorHandle: string }> }) {
  const { creatorHandle } = await params;
  const handle = parseHandle(creatorHandle);
  if (!handle) notFound();
  const creator = await getCreatorStorefront(handle);
  if (!creator) notFound();
  if (creator.handle !== handle) permanentRedirect(`/@${creator.handle}/profile`);

  return <CreatorProfile creator={creator} />;
}
