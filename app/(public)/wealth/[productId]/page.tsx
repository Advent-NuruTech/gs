import type { Metadata } from "next";
import { notFound } from "next/navigation";

import WealthDetailClient from "@/components/wealth/WealthDetailClient";
import { getPublishedWealthProduct, listRelatedWealthProducts } from "@/lib/wealth/server";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://adventskool.co.ke").replace(/\/$/, "");

interface Props {
  params: Promise<{ productId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { productId } = await params;
  const product = await getPublishedWealthProduct(productId);
  if (!product) return { title: "Wealth resource not found", robots: { index: false, follow: false } };

  const title = `${product.title} — ${product.category}`;
  const description =
    product.description ||
    `Explore "${product.title}", a practical ${product.category.toLowerCase()} resource from AdventSkool Wealth Academy. Purchase once to read online or download.`;
  const url = `${siteUrl}/wealth/${encodeURIComponent(product.id)}`;
  const images = product.imageUrl ? [{ url: product.imageUrl, alt: product.title }] : undefined;

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
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: product.imageUrl ? [product.imageUrl] : undefined,
    },
    other: {
      "product:retailer_item_id": product.id,
    },
    robots: { index: true, follow: true },
  };
}

export default async function WealthDetailPage({ params }: Props) {
  const { productId } = await params;
  const product = await getPublishedWealthProduct(productId);
  if (!product) notFound();
  const related = await listRelatedWealthProducts(product.id, product.category, 6);
  const productStructuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    category: product.category,
    image: product.imageUrl || undefined,
    url: `${siteUrl}/wealth/${encodeURIComponent(product.id)}`,
    brand: { "@type": "Brand", name: "AdventSkool" },
    offers: {
      "@type": "Offer",
      priceCurrency: "KES",
      price: product.downloadPrice,
      availability: "https://schema.org/InStock",
      url: `${siteUrl}/wealth/${encodeURIComponent(product.id)}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productStructuredData).replace(/</g, "\\u003c") }}
      />
      <WealthDetailClient product={product} related={related} />
    </>
  );
}
