import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import PdfPageStack from "@/components/wealth/PdfPageStack";
import { getOwnedWealthResource } from "@/lib/wealth/access";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function WealthReaderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(`/dashboard/wealth/${orderId}/read`)}`);

  const resource = await getOwnedWealthResource(orderId, user);
  if (!resource) notFound();
  const readerUrl = `/api/wealth-products/${resource.orderId}/read`;
  const downloadUrl = `/api/wealth/download?productId=${encodeURIComponent(resource.productId)}&reference=${encodeURIComponent(resource.reference)}`;
  const totalPages = Math.max(0, Math.floor(resource.pageCount ?? 0));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/dashboard/wealth" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline">
            <ArrowLeft className="h-4 w-4" /> My Wealth Resources
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{resource.title}</h1>
        </div>
        <a href={downloadUrl} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
          <Download className="h-4 w-4" /> Download
        </a>
      </div>

      {resource.fileType === "pdf" && totalPages > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="rounded-md bg-rose-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
              PDF resource
            </span>
            <span className="text-xs font-medium text-slate-500">
              Full resource · {totalPages} page{totalPages === 1 ? "" : "s"}
            </span>
          </div>
          <PdfPageStack source={resource.fileUrl} title={resource.title} pageCount={totalPages} />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resource.fileType === "image" ? readerUrl : resource.imageUrl}
            alt={resource.title}
            className="h-auto w-full object-contain"
          />
          {resource.fileType === "pdf" ? (
            <p className="border-t border-slate-200 bg-white p-4 text-center text-sm text-slate-600">
              This older PDF does not have page information yet. Use Download to access the complete file.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
