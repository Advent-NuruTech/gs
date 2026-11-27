
"use client";

import Link from "next/link";

import Button from "@/components/ui/Button";
import StatusCard from "@/components/ui/StatusCard";
import ServeStudyDescription from "@/components/serve/ServeStudyDescription";
import ServeLoadingScreen from "@/components/serve/ServeLoadingScreen";
import ServeInstallButton from "@/components/serve/ServeInstallButton";
import { useServeTimetable } from "@/hooks/useServeTimetable";

export default function TimetablePage() {
  const { studies, loading, error, reload } = useServeTimetable();

  if (loading) return <ServeLoadingScreen />;

  return (
    <main className="min-h-screen bg-[#06182b] text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#06182b]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/serve" className="flex items-center gap-3">
            <div className="leading-none">
              <span
                className="text-3xl font-black tracking-tight text-[#a5ff00]"
                style={{
                  textShadow:
                    "2px 3px 0px #06182b, -1px -1px 0px #06182b, 1px -1px 0px #06182b, -1px 1px 0px #06182b",
                }}
              >
                SERVE*
              </span>
              <span className="ml-1 block text-sm font-bold text-white">
                *if saved
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <ServeInstallButton compact />
            <Link
              href="/serve"
              className="rounded-full border border-white/20 px-5 py-2 text-sm font-bold text-white transition hover:border-[#a5ff00] hover:text-[#a5ff00]"
            >
              Home
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(110deg,#06182b_10%,rgba(6,24,43,.94)_55%,rgba(6,24,43,.65)),url('/images/bible.jpg')] bg-cover bg-center" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent to-[#06182b]" />

        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#a5ff00]/40 bg-[#a5ff00]/10 px-4 py-2 text-xs font-bold uppercase tracking-[.2em] text-[#a5ff00]">
            <span className="h-2 w-2 rounded-full bg-[#a5ff00]" />
            The learning journey
          </div>

          <h1 className="text-5xl font-black tracking-tight sm:text-7xl">
            <span className="text-[#a5ff00]">{studies.length}</span> Bible Studies
          </h1>

          <p className="mt-6 max-w-2xl text-xl font-bold leading-relaxed text-white sm:text-2xl">
            A journey from the foundations of Scripture to a firm understanding
            of Present Truth.
          </p>

          <p className="mt-5 max-w-xl leading-7 text-white/65">
            Explore the learning timetable of SERVE* If Saved. Each study is
            designed to build conviction, understanding, spiritual growth and
            readiness for Christian service.
          </p>

          <div className="mt-10 flex flex-wrap gap-6">
            <div>
              <p className="text-3xl font-black text-[#a5ff00]">{studies.length}</p>
              <p className="text-sm text-white/60">Bible studies</p>
            </div>

            <div className="border-l border-white/15 pl-6">
              <p className="text-3xl font-black text-white">4</p>
              <p className="text-sm text-white/60">Months</p>
            </div>

            <div className="border-l border-white/15 pl-6">
              <p className="text-3xl font-black text-[#0788dc]">1</p>
              <p className="text-sm text-white/60">Journey of faith</p>
            </div>
          </div>
        </div>
      </section>

      {/* TIMETABLE */}
      <section className="bg-[#0788dc] px-5 py-20 text-[#06182b]">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10">
            <p className="text-sm font-black uppercase tracking-[.2em] text-white">
              The complete learning path
            </p>

            <h2 className="mt-3 text-3xl font-black sm:text-5xl">
              Study Timetable
            </h2>

            <p className="mt-4 max-w-2xl font-medium leading-7 text-white/90">
              Each study builds upon the previous one, leading the student
              through a progressive understanding of the Bible and the
              message entrusted to God&apos;s people.
            </p>
          </div>

          {error ? <StatusCard kind="error" title="The public timetable could not be loaded" description={error} actions={<Button size="sm" onClick={reload}>Retry</Button>} className="mb-5" /> : null}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {studies.map((study) => (
              <article
                key={study.id}
                className="group flex items-start gap-4 rounded-2xl border border-[#06182b]/10 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div
                  aria-label={`Study ${study.study_number} of ${studies.length}`}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#06182b] text-xs font-black text-[#a5ff00] transition group-hover:bg-[#a5ff00] group-hover:text-[#06182b]"
                >
                  {study.study_number.toString().padStart(2, "0")} / {studies.length.toString().padStart(2, "0")}
                </div>

                <div className="pt-1">
                  <p className="text-xs font-black uppercase tracking-widest text-[#0788dc]">
                    Bible Study {study.study_number}
                  </p>

                  <h3 className="mt-2 font-bold leading-6 text-[#06182b]">
                    {study.title}
                  </h3>
                  {study.description ? (
                    <ServeStudyDescription
                      id={study.id}
                      title={study.title}
                      description={study.description}
                      className="mt-2 text-[#06182b]/70"
                    />
                  ) : null}
                  {study.session_date || study.start_time ? (
                    <p className="mt-3 text-xs font-semibold text-[#06182b]/70">
                      {study.session_date ? new Date(`${study.session_date}T00:00:00`).toLocaleDateString(undefined, { dateStyle: "long" }) : ""}
                      {study.session_date && study.start_time ? " · " : ""}
                      {study.start_time ? study.start_time.slice(0, 5) : ""}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
          {!error && studies.length === 0 ? <StatusCard kind="info" title="The timetable is being prepared" description="Please check back soon for upcoming studies." className="mt-4" /> : null}

          {/* BOTTOM */}
          <div className="mt-12 rounded-3xl bg-[#06182b] p-8 text-white sm:p-10">
            <p className="text-sm font-bold uppercase tracking-[.2em] text-[#a5ff00]">
              The purpose
            </p>

            <h3 className="mt-3 text-3xl font-black sm:text-4xl">
              Be rooted in the Word. Be ready to serve.
            </h3>

            <p className="mt-5 max-w-2xl leading-7 text-white/70">
              Truth is not merely to be known. It is to transform our lives,
              establish us in Christ and equip us to serve others.
            </p>

            <Link
              href="/"
              className="mt-8 inline-block rounded-full bg-[#a5ff00] px-7 py-3 font-extrabold text-[#06182b] transition hover:scale-[1.02]"
            >
              Explore SERVE* If Saved →
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-[#06182b] px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black text-[#a5ff00]">SERVE* If Saved</p>
            <p className="text-xs text-white/50">
              Study the Word. Live the truth. Serve with love.
            </p>
          </div>

          <p className="text-sm text-white/40">
            40 Bible studies • A journey of discovery
          </p>
        </div>
      </footer>
    </main>
  );
}
