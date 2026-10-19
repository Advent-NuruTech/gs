import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import CreatorSocialLinks from "@/components/creator/CreatorSocialLinks";
import StorefrontProductCard from "@/components/creator/StorefrontProductCard";
import ShareButton from "@/components/share/ShareButton";
import StatusCard from "@/components/ui/StatusCard";
import { getCreatorStorefront, getCreatorStorefrontPage } from "@/lib/creators/server";

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

  const renderProducts = (items: typeof products, allowHighlight = false) => (
    <div className="grid min-w-0 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((product) => (
        <StorefrontProductCard
          key={`${product.kind}-${product.id}`}
          product={product}
          creatorHandle={creator.handle}
          highlighted={allowHighlight && query.product === `${product.kind}-${product.id}`}
        />
      ))}
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-7xl space-y-12 px-4 py-8 sm:px-6 sm:py-12">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 sm:p-8">
        <div className="flex min-w-0 flex-col items-center gap-6 text-center md:flex-row md:text-left">
          {creator.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={creator.photoUrl} alt={creator.name} className="h-28 w-28 shrink-0 rounded-full border-4 border-white object-cover shadow-lg dark:border-slate-800 sm:h-36 sm:w-36" />
          ) : null}
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h1 className="break-words text-3xl font-bold text-slate-950 dark:text-white sm:text-4xl">{creator.name}</h1>
              <p className="mt-1 break-all text-sm font-semibold text-blue-700 dark:text-blue-300">@{creator.handle}</p>
            </div>
            {creator.bio ? <p className="max-w-3xl whitespace-pre-line text-slate-700 dark:text-slate-200">{creator.bio}</p> : null}
            <CreatorSocialLinks links={creator.socialLinks} />
          </div>
          <ShareButton title={`${creator.name}'s storefront`} entityLabel="Product" path={`${siteUrl}/@${creator.handle}`} className="shrink-0 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
        </div>
      </section>

      <section className="space-y-5" aria-labelledby="creator-products">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Creator catalogue</p>
          <h2 id="creator-products" className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">Products from {creator.name}</h2>
        </div>
        {products.length ? renderProducts(products, true) : <StatusCard kind="info" title="No published products yet" description="This creator's products will appear here when they are published." />}
      </section>

      {youMayLike.length ? (
        <section className="space-y-5" aria-labelledby="you-may-like">
          <div><p className="text-sm font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Discover more</p><h2 id="you-may-like" className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">You may like from others</h2></div>
          {renderProducts(youMayLike)}
        </section>
      ) : null}

      {mostPopular.length ? (
        <section className="space-y-5" aria-labelledby="most-popular">
          <div><p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Trending on AdventSkool</p><h2 id="most-popular" className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">Most popular</h2></div>
          {renderProducts(mostPopular)}
        </section>
      ) : null}
    </main>
  );
}
