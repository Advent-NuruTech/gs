import Link from "next/link";

interface ServeLegalPageProps {
  title: string;
  intro: string;
  sections: Array<{ title: string; content: string }>;
}

export default function ServeLegalPage({ title, intro, sections }: ServeLegalPageProps) {
  return (
    <main className="min-h-screen bg-[#06182b] px-5 py-12 text-white sm:py-16">
      <article className="mx-auto max-w-3xl">
        <Link href="/serve" className="text-sm font-bold text-[#a5ff00] hover:underline">
          SERVE* If Saved
        </Link>
        <header className="mt-8 border-b border-white/10 pb-8">
          <p className="text-sm font-bold uppercase tracking-[.2em] text-[#a5ff00]">Policies</p>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">{title}</h1>
          <p className="mt-4 text-sm text-white/50">Last updated: 27 November 2026</p>
          <p className="mt-6 leading-7 text-white/70">{intro}</p>
        </header>
        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-bold text-white">{section.title}</h2>
              <p className="mt-3 leading-7 text-white/70">{section.content}</p>
            </section>
          ))}
        </div>
        <nav aria-label="Related policies" className="mt-10 flex flex-wrap gap-x-5 gap-y-3 border-t border-white/10 pt-6 text-sm">
          <Link href="/serve/terms" className="text-[#a5ff00] hover:underline">Terms & Conditions</Link>
          <Link href="/serve/privacy" className="text-[#a5ff00] hover:underline">Privacy Policy</Link>
          <Link href="/serve/cookies" className="text-[#a5ff00] hover:underline">Cookies Policy</Link>
        </nav>
      </article>
    </main>
  );
}
