import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { getOwnedDigitalProduct } from "@/lib/products/access";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProductReaderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(`/dashboard/products/${orderId}/read`)}`);

  const product = await getOwnedDigitalProduct(orderId, user);
  if (!product) notFound();
  const readerUrl = `/api/products/${product.orderId}/read`;
  const downloadUrl = `/api/designs/download?designId=${encodeURIComponent(product.designId)}&reference=${encodeURIComponent(product.reference)}`;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/dashboard/products" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:underline">
            <ArrowLeft className="h-4 w-4" /> My Digital Products
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{product.title}</h1>
        </div>
        <a href={downloadUrl} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
          <Download className="h-4 w-4" /> Download
        </a>
      </div>

      <div className="min-h-[70vh] overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-sm">
        {product.fileType === "pdf" ? (
          <iframe src={readerUrl} title={product.title} className="h-[78vh] w-full bg-white" />
        ) : (
          <div className="flex min-h-[70vh] items-center justify-center p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={readerUrl} alt={product.title} className="max-h-[75vh] max-w-full object-contain" />
          </div>
        )}
      </div>
    </section>
  );
}
