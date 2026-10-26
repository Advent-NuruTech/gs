import Link from "next/link";
import { ArrowLeft, Store } from "lucide-react";

import CreatorBio from "@/components/creator/CreatorBio";
import CreatorSocialLinks from "@/components/creator/CreatorSocialLinks";
import ShareButton from "@/components/share/ShareButton";
import { CreatorStorefrontProfile } from "@/types/creator";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://adventskool.co.ke").replace(/\/$/, "");

export default function CreatorProfile({ creator }: { creator: CreatorStorefrontProfile }) {
  const storefrontPath = `/@${creator.handle}`;

  return (
    <div className="creator-profile min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex min-h-20 max-w-5xl items-center px-4 sm:px-6">
          <Link href={storefrontPath} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-slate-200 dark:hover:bg-blue-950 dark:hover:text-blue-100">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to store
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="h-24 bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 dark:from-emerald-950 dark:via-emerald-800 dark:to-teal-900 sm:h-32" />
          <div className="px-5 pb-6 sm:px-8 sm:pb-8">
            <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end">
                <div className="-mt-14 grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-3xl border-4 border-white bg-emerald-100 text-emerald-800 shadow-md dark:border-slate-900 dark:bg-emerald-950 dark:text-emerald-200 sm:-mt-16 sm:h-32 sm:w-32">
                  {creator.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={creator.photoUrl} alt={`${creator.name}'s profile`} className="h-full w-full object-cover" />
                  ) : <Store className="h-12 w-12" aria-hidden="true" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Creator profile</p>
                  <h1 className="mt-1 break-words text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{creator.name}</h1>
                  <p className="mt-1 break-all text-sm text-slate-600 dark:text-slate-300">@{creator.handle}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={storefrontPath} className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Visit store</Link>
                <ShareButton title={`${creator.name}'s profile`} entityLabel="Profile" path={`${siteUrl}${storefrontPath}/profile`} className="rounded-xl px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8" aria-labelledby="about-creator">
          <h2 id="about-creator" className="text-xl font-bold text-slate-950 dark:text-white">About {creator.name}</h2>
          {creator.bio ? <div className="mt-4"><CreatorBio bio={creator.bio} full /></div> : <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">This creator has not added an introduction yet. Explore their store to see their courses and products.</p>}
          <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
            <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Find {creator.name} online</p>
            <CreatorSocialLinks links={creator.socialLinks} />
          </div>
        </section>
      </main>
    </div>
  );
}
