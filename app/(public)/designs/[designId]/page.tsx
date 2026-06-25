import type { Metadata } from "next";
import { notFound } from "next/navigation";

import DesignDetailClient from "@/components/design/DesignDetailClient";
import { getPublishedDesign, listRelatedDesigns } from "@/lib/designs/server";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://skills.adventnurutech.xyz";

interface Props {
  params: Promise<{ designId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { designId } = await params;
  const design = await getPublishedDesign(designId);
  if (!design) {
    return { title: "Design not found", robots: { index: false, follow: false } };
  }

  const title = `${design.title} — ${design.category}`;
  const description =
    design.description ||
    `Get a custom ${design.category.toLowerCase()} designed like "${design.title}" — your text, your colors, your photos. Browse free on AdventSkool Designs.`;
  const url = `${siteUrl}/designs/${design.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      siteName: "AdventSkool",
      images: design.imageUrl ? [{ url: design.imageUrl, alt: design.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: design.imageUrl ? [design.imageUrl] : undefined,
    },
    robots: { index: true, follow: true },
  };
}

export default async function DesignDetailPage({ params }: Props) {
  const { designId } = await params;
  const design = await getPublishedDesign(designId);
  if (!design) notFound();
  const related = await listRelatedDesigns(design.id, design.category, 6);
  return <DesignDetailClient design={design} related={related} />;
}
