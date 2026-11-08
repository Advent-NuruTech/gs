import { Metadata } from "next";
import Link from "next/link";

import Button from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "About",
  description:
    "Discover AdventSkool: a Kenya-focused platform for online courses, Digital Products, creator storefronts, and AdventPay invoicing.",
  openGraph: {
    title: "About AdventSkool",
    description:
      "Discover AdventSkool: a Kenya-focused platform for online courses, Digital Products, creator storefronts, and AdventPay invoicing.",
  },
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
      "A mobile-first experience designed to make learning and digital resources easier to reach.",
  },
  {
    title: "Quality Content",
    description:
      "Structured outlines, rich media, and practical quizzes help teachers deliver courses that genuinely stick.",
  },
  {
    title: "Trust & Privacy",
    description:
      "We work to protect personal information and treat it with care.",
  },
];

const offerings = [
  {
    title: "Online courses",
    description:
      "Learn through structured lessons, quizzes, and progress tracking. Connect with teachers and join scheduled live classes.",
    href: "/courses",
    link: "Explore courses",
  },
  {
    title: "Digital Products",
    description:
      "Discover practical resources such as templates, guides, and workbooks. Depending on the product, access your purchase by download or online reading.",
    href: "/resources",
    link: "Explore resources",
  },
  {
    title: "For creators",
    description:
      "Publish courses and Digital Products, share your storefront, and host live classes. Eligible sales can be split through Paystack after approval and payout verification.",
    href: "/register/creator",
    link: "Become a creator",
  },
  {
    title: "AdventPay",
    description:
      "Manage invoices and payment history, download receipts after payment, and use available payment collection options.",
    href: "/adventpay",
    link: "Explore AdventPay",
  },
];

const stats = [
  { value: "Mobile-first", label: "Built for your devices" },
  { value: "Courses", label: "Learn at your pace" },
  { value: "Digital", label: "Practical resources" },
  { value: "KES", label: "Kenyan shilling payments" },
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
          AdventSkool brings online courses and practical Digital Products together in one
          mobile-first platform. Built with Kenyan learners and creators in mind, it helps people
          learn new skills, share their expertise, and find resources for their goals.
        </p>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          AdventSkool is a product of{" "}
          <span className="font-semibold text-slate-900">Advent NuruTech</span>.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/resources">
            <Button>Explore Resources</Button>
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
            <p className="break-words text-xl font-black text-blue-700 sm:text-2xl">{stat.value}</p>
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
            Learn, create, and manage payments with tools built for practical progress.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {offerings.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
              <Link href={item.href} className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300">
                {item.link}
              </Link>
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
          href="mailto:adventskool@gmail.com"
          className="mt-6 inline-block text-sm font-semibold text-blue-400 hover:underline"
        >
          adventskool@gmail.com
        </a>
      </section>

      {/* CTA */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Ready to learn or create?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">
          Explore courses and digital resources, or join the community and share what you know.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/resources">
            <Button>Explore Resources</Button>
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
