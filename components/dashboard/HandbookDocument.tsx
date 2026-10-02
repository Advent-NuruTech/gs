import { Fragment } from "react";

import {
  HANDBOOK_META,
  HANDBOOK_SECTIONS,
  type HandbookBlock,
} from "@/lib/handbook/content";

const calloutToneClass: Record<"info" | "success" | "warning", string> = {
  info: "border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100",
  success:
    "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100",
  warning:
    "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100",
};

function Block({ block }: { block: HandbookBlock }) {
  switch (block.kind) {
    case "paragraph":
      return (
        <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{block.text}</p>
      );

    case "bullets":
      return (
        <div className="space-y-2">
          {block.title ? (
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{block.title}</p>
          ) : null}
          <ul className="space-y-1.5">
            {block.items.map((item) => (
              <li key={item} className="flex min-w-0 gap-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600 dark:bg-blue-400" />
                <span className="min-w-0 break-words">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      );

    case "numbered":
      return (
        <div className="space-y-2">
          {block.title ? (
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{block.title}</p>
          ) : null}
          <ol className="space-y-1.5">
            {block.items.map((item, index) => (
              <li key={item} className="flex min-w-0 gap-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                <span className="mt-0.5 shrink-0 font-semibold text-blue-700 dark:text-blue-300">
                  {index + 1}.
                </span>
                <span className="min-w-0 break-words">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      );

    case "definitions":
      return (
        <dl className="space-y-2">
          {block.title ? (
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{block.title}</p>
          ) : null}
          {block.items.map((item) => (
            <div key={item.term} className="min-w-0 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <dt className="break-words text-sm font-semibold text-slate-900 dark:text-white">{item.term}</dt>
              <dd className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">{item.description}</dd>
            </div>
          ))}
        </dl>
      );

    case "table":
      return (
        <div className="space-y-2">
          {block.caption ? (
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{block.caption}</p>
          ) : null}
          <div className="handbook-table-scroll -mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-300 dark:border-slate-700">
                  {block.columns.map((column) => (
                    <th
                      key={column}
                      scope="col"
                      className="py-2 pr-3 align-bottom text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row) => (
                  <tr key={row.join("|")} className="border-b border-slate-200 align-top last:border-0 dark:border-slate-800">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={`${row[0]}-${cellIndex}`}
                        className={`py-2 pr-3 leading-6 text-slate-700 dark:text-slate-300 ${
                          cellIndex === 0 ? "font-medium text-slate-900 dark:text-white" : ""
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    case "callout":
      return (
        <div
          role="note"
          className={`handbook-callout handbook-callout-${block.tone} rounded-lg border-l-4 p-3 ${calloutToneClass[block.tone]}`}
        >
          <p className="text-sm font-semibold">{block.title}</p>
          <p className="mt-1 text-sm leading-6 opacity-90">{block.text}</p>
        </div>
      );
  }
}

/**
 * Presentational renderer for the AdventSkool Handbook. Purely driven by
 * `lib/handbook/content.ts` so the on-screen page, the print/PDF output, and
 * the Markdown export can never drift apart.
 */
export default function HandbookDocument() {
  return (
    <article className="handbook-doc space-y-8">
      <div className="handbook-cover rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-700 dark:text-blue-300">
          Internal handbook · v{HANDBOOK_META.version}
        </p>
        <h1 className="mt-2 break-words text-3xl font-bold text-slate-950 sm:text-4xl dark:text-white">
          {HANDBOOK_META.title}
        </h1>
        <p className="mt-2 text-base text-slate-700 dark:text-slate-300">{HANDBOOK_META.subtitle}</p>
        <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-slate-200 pt-4 text-sm sm:grid-cols-2 dark:border-slate-800">
          {[
            ["Canonical site", HANDBOOK_META.canonicalUrl],
            ["Support email", HANDBOOK_META.supportEmail],
            ["Transactional sender", HANDBOOK_META.transactionalSender],
            ["Built by", HANDBOOK_META.builtBy],
          ].map(([term, value]) => (
            <div key={term} className="min-w-0">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{term}</dt>
              <dd className="mt-0.5 break-words font-medium text-slate-900 dark:text-white">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">{HANDBOOK_META.audience}</p>
      </div>

      <div
        aria-label="Handbook contents"
        className="handbook-chapter rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <h2 className="text-lg font-bold text-slate-950 dark:text-white">Contents</h2>
        <ol className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {HANDBOOK_SECTIONS.map((section) => (
            <li key={section.id} className="flex min-w-0 gap-2 text-sm">
              <span className="w-5 shrink-0 font-semibold text-slate-400 dark:text-slate-500">{section.chapter}</span>
              <a
                href={`#chapter-${section.id}`}
                className="min-w-0 break-words text-blue-700 underline underline-offset-2 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
              >
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </div>

      {HANDBOOK_SECTIONS.map((section) => (
        <Fragment key={section.id}>
          <section
            id={`chapter-${section.id}`}
            className="handbook-chapter min-w-0 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-700 dark:text-blue-300">
                Chapter {section.chapter}
              </p>
              <h2 className="mt-1 break-words text-2xl font-bold text-slate-950 dark:text-white">{section.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{section.summary}</p>
            </div>
            <div className="space-y-4">
              {section.blocks.map((block, index) => (
                <Block key={`${section.id}-${index}`} block={block} />
              ))}
            </div>
          </section>
        </Fragment>
      ))}

      <footer className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <p className="font-medium text-slate-900 dark:text-white">Keeping this handbook accurate</p>
        <p className="mt-1 leading-6">
          Every chapter above is generated from <code className="break-words">lib/handbook/content.ts</code>. Change the
          source and the page, the printed PDF, and the Markdown AI-training export all update together. Review this
          handbook whenever commissions, fee modes, product lines, or published policies change.
        </p>
      </footer>
    </article>
  );
}
