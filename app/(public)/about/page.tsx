import { Metadata } from "next";
import Link from "next/link";

import Button from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "About | AdventSkool",
  description:
    "AdventSkool is a mobile-first learning management platform and a product of Advent NuruTech, built to make structured, high-quality education accessible to everyone.",
};

const values = [
  {
    title: "Learner First",
    description:
      "Every feature is designed around the student — clear milestones, bite-size lessons, and progress you can actually see and feel.",
  },
  {
    title: "Accessible by Design",
    description:
      "Mobile-first and lightweight, so learning works on any device, on any connection, anywhere in the world.",
  },
  {
    title: "Quality Content",
    description:
      "Structured outlines, rich media, and practical quizzes help teachers deliver courses that genuinely stick.",
  },
  {
    title: "Trust & Privacy",
    description:
      "We hold ourselves to international data protection standards and treat your data with the care it deserves.",
  },
];

const offerings = [
  {
    title: "For Students",
    description:
      "Browse and enrol in courses, follow guided lessons with progressive unlocks, take quizzes, and track your progress from first login to completion.",
  },
  {
    title: "For Teachers",
    description:
      "Upload courses with rich outlines and media, schedule and host live classes via Google Calendar and Meet, and engage learners with structured assessments.",
  },
  {
    title: "For Administrators",
    description:
      "Manage users and roles, monitor analytics, send notifications, and oversee a secure, scalable learning operation from a single dashboard.",
  },
];

const stats = [
  { value: "Mobile", label: "First Experience" },
  { value: "24/7", label: "Anywhere Access" },
  { value: "Step", label: "By Step Learning" },
  { value: "Secure", label: "By Default" },
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-16 px-4 py-12 sm:py-16">
      {/* Hero */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
          About AdventSkool
        </p>
        <h1 className="mt-4 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
          Education that meets every learner where they are.
        </h1>
        <p className="mt-4 max-w-2xl text-slate-600">
          AdventSkool is a guided, mobile-first learning management platform built to make
          structured, high-quality education accessible to everyone. From a first lesson to a
          completed course, we help students, teachers, and institutions learn and teach with
          clarity and confidence.
        </p>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          AdventSkool is a product of{" "}
          <span className="font-semibold text-slate-900">Advent NuruTech</span>.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/courses">
            <Button>Browse Courses</Button>
          </Link>
          <Link href="/register">
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700">
              Create an Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm"
          >
            <p className="text-2xl font-black text-blue-700">{stat.value}</p>
            <p className="mt-1 text-xs font-medium text-slate-600 sm:text-sm">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* Mission */}
      <section className="grid gap-8 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-emerald-50 p-6 shadow-sm sm:p-10 md:grid-cols-2 md:items-center">
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Our Mission</p>
          <h2 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
            Make meaningful learning simple, structured, and within reach.
          </h2>
        </div>
        <p className="text-slate-700">
          We believe learning should be guided, not overwhelming. AdventSkool breaks knowledge into
          clear, achievable steps, gives learners real visibility into their progress, and equips
          educators with the tools to deliver courses that change outcomes — all on a platform built
          to perform on the devices people actually use.
        </p>
      </section>

      {/* What we offer */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">What We Offer</h2>
          <p className="max-w-2xl text-slate-600">
            One platform, built for every role in the learning journey.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {offerings.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">What We Stand For</h2>
          <p className="max-w-2xl text-slate-600">
            The principles that shape every decision we make.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {values.map((value) => (
            <div
              key={value.title}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-slate-900">{value.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{value.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About Advent NuruTech */}
      <section className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-slate-100 shadow-sm sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
          The Company Behind AdventSkool
        </p>
        <h2 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">Advent NuruTech</h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
          Advent NuruTech is a technology company building practical, human-centred digital products
          that solve real problems. AdventSkool is our flagship learning platform — the expression of
          our belief that thoughtfully engineered software can widen access to opportunity and
          education. We are committed to building reliable, secure, and inclusive technology that
          serves communities and learners everywhere.
        </p>
        <a
          href="mailto:adventnurutech@gmail.com"
          className="mt-6 inline-block text-sm font-semibold text-blue-400 hover:underline"
        >
          adventnurutech@gmail.com
        </a>
      </section>

      {/* CTA */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Ready to start learning?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">
          Join AdventSkool today and turn your goals into completed courses, one guided step at a
          time.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/courses">
            <Button>Browse Courses</Button>
          </Link>
          <Link href="/register">
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700">
              Get Started
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
