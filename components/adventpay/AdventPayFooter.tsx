import Link from "next/link";

export default function AdventPayFooter() {
  return <footer className="border-t border-sky-100 bg-slate-950 text-slate-300 dark:border-slate-800"><div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-7 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6"><p>© {new Date().getFullYear()} AdventPay by AdventSkool.</p><div className="flex flex-wrap gap-x-4 gap-y-2"><Link href="/terms" className="hover:text-white">Terms</Link><Link href="/privacy" className="hover:text-white">Privacy</Link><a href="mailto:adventskool@gmail.com" className="hover:text-white">Support</a></div></div></footer>;
}
