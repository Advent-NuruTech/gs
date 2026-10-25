import type { ReactNode } from "react";

type LegalSection = { title: string; content: ReactNode };

export default function AdventPayLegalPage({
  title,
  summary,
  sections,
}: {
  title: string;
  summary: string;
  sections: LegalSection[];
}) {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-16">
      <header className="border-b border-sky-100 pb-8 dark:border-slate-800">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">AdventPay legal</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">{title}</h1>
        <p className="mt-4 leading-7 text-slate-600 dark:text-slate-300">{summary}</p>
        <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">Last updated: October 25, 2026</p>
      </header>
      <div className="space-y-8 py-9">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">{section.title}</h2>
            <div className="mt-3 space-y-3 leading-7 text-slate-600 dark:text-slate-300">{section.content}</div>
          </section>
        ))}
      </div>
    </article>
  );
}
