import Link from "next/link";
import { ArrowRight, BellRing, CreditCard, FileCheck2, Landmark, LockKeyhole } from "lucide-react";

export const metadata = { title: "Advent Pay | AdventSkool", description: "Secure account invoicing, payment history and professional receipts." };

const features = [
  { icon: BellRing, title: "Invoice notifications", text: "Receive an in-app alert when a new invoice is issued to your registered AdventSkool account." },
  { icon: CreditCard, title: "Pay securely", text: "Pay online with Paystack when available, or follow the Till details shown on your invoice." },
  { icon: FileCheck2, title: "Professional receipts", text: "Download a clear receipt after a payment has been confirmed." },
];

export default function AdventPayPublicPage() {
  return <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-20">
    <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-sky-700 via-blue-700 to-indigo-800 px-6 py-12 text-white shadow-xl sm:px-10 lg:px-14">
      <div className="max-w-3xl"><p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold"><LockKeyhole className="h-4 w-4" /> Account-based billing</p><h1 className="text-4xl font-black tracking-tight sm:text-5xl">Advent Pay keeps your invoices and receipts together.</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-blue-100">Sign in to your AdventSkool account to view pending invoices, your next billing date, payment history, and downloadable professional receipts.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/login?redirect=%2Fdashboard%2Fadvent-pay" className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 font-bold text-blue-800 shadow-sm transition hover:bg-blue-50">Sign in to Advent Pay <ArrowRight className="h-4 w-4" /></Link><Link href="/register" className="inline-flex items-center gap-2 rounded-lg border border-white/50 px-5 py-3 font-bold text-white transition hover:bg-white/10">Create an account</Link></div></div>
    </section>
    <section className="mt-12 grid gap-5 md:grid-cols-3">{features.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"><Icon className="h-7 w-7 text-blue-600 dark:text-blue-300" /><h2 className="mt-4 text-lg font-bold text-slate-950 dark:text-white">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p></article>)}</section>
    <section className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900"><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><Landmark className="h-8 w-8 shrink-0 text-blue-600 dark:text-blue-300" /><div><h2 className="font-bold text-slate-950 dark:text-white">Using Till payment?</h2><p className="text-sm text-slate-600 dark:text-slate-300">Your individual invoice displays the current Till details and payment reference. AdventSkool confirms Till payments before issuing a receipt.</p></div></div></section>
  </main>;
}
