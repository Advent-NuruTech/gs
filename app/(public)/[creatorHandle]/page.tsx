import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import CreatorStorefront from "@/components/creator/CreatorStorefront";
import { getCreatorStorefront, getCreatorStorefrontPage } from "@/lib/creators/server";
import { StorefrontProduct, StorefrontProductKind } from "@/types/creator";

export const dynamic = "force-dynamic";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://adventskool.co.ke").replace(/\/$/, "");

function mixRecommendations(items: StorefrontProduct[], limit = 8) {
  const kinds: StorefrontProductKind[] = ["course", "design"];
  const unique = [...new Map(items.map((item) => [`${item.kind}:${item.id}`, item])).values()];
  const queues = new Map(kinds.map((kind) => [kind, unique.filter((item) => item.kind === kind)]));
  const mixed: StorefrontProduct[] = [];
  while (mixed.length < limit && kinds.some((kind) => (queues.get(kind)?.length ?? 0) > 0)) {
    kinds.forEach((kind) => {
      const next = queues.get(kind)?.shift();
      if (next && mixed.length < limit) mixed.push(next);
    });
  }
  return mixed;
}

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
  const title = `${creator.name} (@${creator.handle}) | AdventSkool`;
  const description = creator.bio ?? `Explore courses and digital products from ${creator.name} on AdventSkool.`;
  const url = `${siteUrl}/@${creator.handle}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "profile", images: creator.photoUrl ? [creator.photoUrl] : undefined },
  };
}

export default async function CreatorStorefrontPage({
  params,
  searchParams,
}: {
  params: Promise<{ creatorHandle: string }>;
  searchParams: Promise<{ product?: string }>;
}) {
  const [{ creatorHandle }, query] = await Promise.all([params, searchParams]);
  const handle = parseHandle(creatorHandle);
  if (!handle) notFound();
  const page = await getCreatorStorefrontPage(handle);
  if (!page) notFound();
  const { creator, products, youMayLike, mostPopular } = page;
  if (creator.handle !== handle) permanentRedirect(`/@${creator.handle}`);
  const recommendations = mixRecommendations([...youMayLike, ...mostPopular]);

  return <CreatorStorefront creator={creator} products={products} recommendations={recommendations} highlightedProduct={query.product} />;
}
