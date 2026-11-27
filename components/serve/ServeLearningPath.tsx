"use client";

import Link from "next/link";

import Button from "@/components/ui/Button";
import StatusCard from "@/components/ui/StatusCard";
import ServeStudyDescription from "@/components/serve/ServeStudyDescription";
import { useServeTimetable } from "@/hooks/useServeTimetable";

export default function ServeLearningPath() {
  const { studies, loading, error, reload } = useServeTimetable();
  const featuredStudies = studies.slice(0, 6);

  return (
    <section id="journey" className="bg-[#0788dc] px-5 py-24 text-[#06182b]">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 rounded-[2rem] border border-white/15 bg-[#06182b]/15 p-5 sm:p-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <div className="relative aspect-square overflow-hidden rounded-3xl border border-white/15">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/serve/40daysbanner.jpeg"
              alt="SERVE 40 Bible studies program banner"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>

          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-extrabold uppercase tracking-[.2em] text-white">
              The learning path
            </p>
            <h2 className="text-4xl font-black leading-tight text-white sm:text-6xl">
              {studies.length ? `${studies.length} Bible studies.` : "Bible studies."}
              <br />
              4 months of discovery.
            </h2>
            <p className="mt-5 max-w-2xl text-lg font-bold leading-8 text-white">
              The studies below come directly from the published SERVE timetable. When the SERVE team adds or edits a study, this learning path updates to match.
            </p>
          </div>
        </div>

        {error ? (
          <StatusCard
            kind="error"
            title="The learning path could not be refreshed"
            description={error}
            actions={<Button size="sm" onClick={reload}>Retry</Button>}
            className="mt-6"
          />
        ) : null}

        {loading ? (
          <StatusCard kind="loading" title="Loading the published studies" className="mt-6" />
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featuredStudies.map((study) => (
            <article
              key={study.id}
              className="min-w-0 rounded-3xl border border-[#06182b]/15 bg-white/90 p-7"
            >
              <span className="text-sm font-black tracking-[.18em]">
                {study.study_number.toString().padStart(2, "0")} / {studies.length.toString().padStart(2, "0")}
              </span>
              <h3 className="mt-4 break-words text-xl font-black">{study.title}</h3>
              {study.description ? (
                <ServeStudyDescription
                  id={study.id}
                  title={study.title}
                  description={study.description}
                  className="mt-3 text-[#06182b]/75"
                />
              ) : null}
            </article>
          ))}
        </div>

        {!loading && !error && studies.length === 0 ? (
          <StatusCard kind="info" title="No published studies yet" description="Published studies added to the timetable will appear here." className="mt-6" />
        ) : null}

        <div className="mt-8 rounded-3xl bg-[#06182b] p-8 text-white md:flex md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-[#a5ff00]">
              The complete curriculum
            </p>
            <h3 className="mt-2 text-2xl font-black">
              {studies.length
                ? `${studies.length} published studies, arranged into a four-month plan.`
                : "Published studies, arranged into a four-month plan."}
            </h3>
          </div>
          <Link
            href="/serve/timetable"
            className="mt-6 inline-block rounded-full bg-[#a5ff00] px-7 py-3 font-bold text-[#06182b] md:mt-0"
          >
            View entire timetable <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
