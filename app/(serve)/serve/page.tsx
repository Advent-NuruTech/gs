
import Link from "next/link";
import Image from "next/image";

const series = [
  {
    n: "01",
    title: "The Bible & Its Authority",
    desc: "Begin with the foundation: why Scripture is our guide and how to study it.",
  },
  {
    n: "02",
    title: "God, Creation & the Great Controversy",
    desc: "Discover the story behind the world, sin, redemption and God's character.",
  },
  {
    n: "03",
    title: "Jesus Christ & the Gospel",
    desc: "Understand the life, death, resurrection and ministry of Jesus.",
  },
  {
    n: "04",
    title: "Prophecy & the Last Days",
    desc: "Build a clear, Bible-based framework for prophetic study.",
  },
  {
    n: "05",
    title: "The Sanctuary & Present Truth",
    desc: "Explore the sanctuary message and its place in the plan of salvation.",
  },
  {
    n: "06",
    title: "Christian Living & Mission",
    desc: "Put what you learn into practice through a life of faith and service.",
  },
];

function ServeLogoText({
  size = "normal",
}: {
  size?: "normal" | "large";
}) {
  return (
    <div className="flex flex-col items-start leading-none">
      <span
        className={`font-black tracking-tight text-[#a5ff00] ${
          size === "large"
            ? "text-7xl sm:text-9xl"
            : "text-3xl"
        }`}
        style={{
          textShadow:
            "4px 5px 0px #06182b, -2px -2px 0px #06182b, 2px -2px 0px #06182b, -2px 2px 0px #06182b",
        }}
      >
        SERVE*
      </span>

      <span
        className={`font-bold text-white ${
          size === "large"
            ? "ml-2 text-2xl sm:text-4xl"
            : "ml-1 text-sm"
        }`}
      >
        *if saved
      </span>
    </div>
  );
}

export default function ServeIfSavedPage() {
  return (
    <main className="min-h-screen bg-[#06182b] text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#06182b]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <a href="#" className="flex items-center gap-3">
            <Image
              src="/images/serve/servelogo.png"
              alt="SERVE if saved logo"
              width={52}
              height={52}
              className="rounded-full object-cover"
            />

            <ServeLogoText />
          </a>

          <nav className="hidden items-center gap-8 text-sm text-white/75 md:flex">
            <a href="#about" className="hover:text-[#a5ff00]">
              About
            </a>

            <a href="#journey" className="hover:text-[#a5ff00]">
              40-Day Series
            </a>

            <a href="#method" className="hover:text-[#a5ff00]">
              How it works
            </a>
            <Link href="/serve/timetable" className="hover:text-[#a5ff00]">
              Timetable
            </Link>
          </nav>

          <Link
            href="/serve/register"
            className="rounded-full bg-[#a5ff00] px-5 py-2.5 text-sm font-bold text-[#06182b] transition hover:scale-[1.02]"
          >
            Register
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(110deg,#06182b_12%,rgba(6,24,43,.88)_48%,rgba(6,24,43,.2)),url('/images/bible.jpg')] bg-cover bg-center" />

        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-[#06182b]" />

        <div className="mx-auto grid min-h-[680px] max-w-7xl items-center gap-10 px-5 py-20 lg:grid-cols-[1.15fr_.85fr]">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#a5ff00]/40 bg-[#a5ff00]/10 px-4 py-2 text-xs font-bold uppercase tracking-[.2em] text-[#a5ff00]">
              <span className="h-2 w-2 rounded-full bg-[#a5ff00]" />
              A 4-month Bible journey
            </div>

            {/* BRAND LOGO TEXT */}
            <div className="mb-6">
              <ServeLogoText size="large" />
            </div>

            <p className="mt-6 max-w-2xl text-xl font-medium leading-relaxed text-white/85 sm:text-2xl">
              Forty Bible studies. One journey from the foundations to a firm
              understanding of Present Truth.
            </p>

            <p className="mt-4 max-w-xl leading-7 text-white/65">
              A guided, Scripture-first learning journey designed to help you
              understand what you believe, why you believe it, and how to live
              and share it.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
              href="/serve/timetable"
                className="rounded-full bg-[#a5ff00] px-7 py-4 font-extrabold text-[#06182b] hover:bg-[#baff36]"
              >
                View timetable <span aria-hidden>→</span>
              </Link>

              <a
                href="#journey"
                className="rounded-full border border-white/30 px-7 py-4 font-bold hover:border-[#a5ff00] hover:text-[#a5ff00]"
              >
                Explore the studies
              </a>

            
            </div>

            <div className="mt-12 flex flex-wrap gap-8 text-sm text-white/70">
              <div>
                <strong className="block text-2xl text-white">40</strong>
                Bible studies
              </div>

              <div>
                <strong className="block text-2xl text-white">4 months</strong>
                Guided learning
              </div>

              <div>
                <strong className="block text-2xl text-white">Bible-first</strong>
                Every lesson
              </div>
            </div>
          </div>

          {/* HERO IMAGE */}
          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-5 rounded-[2rem] border border-[#a5ff00]/20 rotate-3" />

            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl">
              <Image
                src="/images/serve/40daysbanner.jpeg"
                alt="SERVE 40 Bible studies program banner"
                width={1024}
                height={1024}
                className="h-auto w-full object-contain"
              />

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#06182b] via-[#06182b]/85 to-transparent p-8 pt-24">
                <p className="text-xs font-bold uppercase tracking-[.22em] text-[#a5ff00]">
                  The invitation
                </p>

                <p className="mt-2 text-2xl font-bold">
                  “Search the scriptures.”
                </p>

                <p className="mt-2 text-white/70">John 5:39</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="mx-auto max-w-7xl px-5 py-24">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-sm font-bold uppercase tracking-[.2em] text-[#a5ff00]">
            SERVE IF SAVED
          </p>

          <h2 className="text-3xl font-black leading-tight sm:text-5xl">
            40 Studies. 4 Months. One Foundation.
          </h2>

          <div className="mt-8 space-y-5 text-lg leading-8 text-white/70">
            <p className="font-bold text-white">
              Every Christian is born into the kingdom as a missionary.
            </p>

            <p>
              If you have tasted the word of life, you cannot keep it to
              yourself. You must share it, in every way you can.
            </p>

            <p>
              But how can people believe without hearing, and how can they hear
              without a preacher? Faith comes by hearing, and hearing by the
              word of God. Before you serve, you must first hear, be convicted
              by present truth, and be found standing in the kingdom.
            </p>

            <p className="font-bold text-white">
              You cannot preach a gospel that has not saved you.
            </p>

            <p>
              Someone who wants to rescue a drowning person from a fast current
              must first stand on firm ground. That is the purpose of this
              series: <strong className="text-white">to plant your feet.</strong>
            </p>
          </div>

          <div className="mt-12 grid gap-10 sm:grid-cols-2">
            <div>
              <h3 className="text-2xl font-black text-white">
                What is Serve If Saved?
              </h3>
              <p className="mt-4 leading-7 text-white/70">
                Serve If Saved is a mission to teach present truth through{" "}
                <strong className="text-white">
                  40 Bible studies over 4 months.
                </strong>
              </p>
              <p className="mt-4 leading-7 text-white/70">
                It is inspired by Christ&apos;s 40 days of fasting before He
                began His public ministry. He prepared before He served, and so
                should we. Each study counts as one day of that journey, so 40
                studies make up the 40 days.
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-black text-white">
                What you will learn
              </h3>
              <ul className="mt-4 list-disc space-y-3 pl-5 leading-7 text-white/70">
                <li>
                  Each study covers one truth, and each truth is a foundation
                  for anyone who wants to commit their life to present truth.
                </li>
                <li>
                  We cover everything from theory to practical application, so
                  that a man of God can rightly divide the word of truth.
                </li>
                <li>
                  As you water others, you are watered yourself. You become a
                  worker who needs not be ashamed, thoroughly equipped for every
                  good work.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-2xl font-black text-white">
                Who will teach you
              </h3>
              <p className="mt-4 leading-7 text-white/70">
                Students will learn from{" "}
                <strong className="text-white">ministers around the world</strong>{" "}
                who are experienced in gospel ministry.
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-black text-white">
                Be part of the journey
              </h3>
              <p className="mt-4 leading-7 text-white/70">
                You are welcome to join us:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 leading-7 text-white/70">
                <li>
                  <strong className="text-white">As a student</strong>, to
                  learn and be grounded
                </li>
                <li>
                  <strong className="text-white">As a teacher</strong>, to
                  share what God has given you
                </li>
                <li>
                  <strong className="text-white">As a partner or sponsor</strong>,
                  to keep this work going
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-white/10 pt-6">
            <p className="text-xl font-black text-[#a5ff00]">SERVE* If Saved</p>
            <p className="mt-2 text-white">Byron Onyango</p>
            <p className="text-sm text-white/60">Gospel Minister</p>
          </div>
        </div>
      </section>

      {/* LEARNING PATH */}
      <section id="journey" className="bg-[#0788dc] px-5 py-24 text-[#06182b]">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 rounded-[2rem] border border-white/15 bg-[#06182b]/15 p-5 sm:p-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
            <div className="relative aspect-square overflow-hidden rounded-3xl border border-white/15 shadow-xl">
              <Image
                src="/images/serve/40daysbanner.jpeg"
                alt="SERVE 40 Bible studies program banner"
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
            </div>

            <div className="max-w-3xl">
              <p className="mb-3 text-sm font-extrabold uppercase tracking-[.2em] text-white">
                The learning path
              </p>

              <h2 className="text-4xl font-black leading-tight text-white sm:text-6xl">
                40 Bible studies.
                <br />
                4 months of discovery.
              </h2>

              <p className="mt-5 max-w-2xl text-lg font-bold leading-8 text-white">
                A progressive curriculum—from the foundations of Bible study to
                the connected truths that shape a Present Truth understanding.
                The six themes below are illustrative pillars; the full program
                can be organized into all 40 individual studies.
              </p>
            </div>
          </div>

          {/* SERIES CARDS */}
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {series.map((item) => (
              <article
                key={item.n}
                className="rounded-3xl border border-[#06182b]/15 bg-white/90 p-7 shadow-sm"
              >
                <span className="text-sm font-black tracking-[.18em]">
                  {item.n} / 40
                </span>

                <h3 className="mt-4 text-xl font-black">{item.title}</h3>

                <p className="mt-3 leading-7 text-[#06182b]/75">
                  {item.desc}
                </p>
              </article>
            ))}
          </div>

          {/* COMPLETE CURRICULUM */}
          <div className="mt-8 rounded-3xl bg-[#06182b] p-8 text-white md:flex md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-[#a5ff00]">
                The complete curriculum
              </p>

              <h3 className="mt-2 text-2xl font-black">
                40 individual studies, arranged into a four-month plan.
              </h3>
            </div>

            <a
              href="#join"
              className="mt-6 inline-block rounded-full bg-[#a5ff00] px-7 py-3 font-bold text-[#06182b] md:mt-0"
            >
              Join us <span aria-hidden>→</span>
            </a>
          </div>
        </div>
      </section>

      {/* METHOD */}
      <section id="method" className="mx-auto max-w-7xl px-5 py-24">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-bold uppercase tracking-[.2em] text-[#a5ff00]">
              A simple rhythm
            </p>

            <h2 className="text-4xl font-black sm:text-5xl">
              Learn. Study. Apply. Share.
            </h2>
          </div>

          <div className="space-y-5">
            {[
              "Learn the topic through a guided series.",
              "Study the Bible texts personally and in context.",
              "Ask questions, revisit key truths and build clarity.",
              "Apply what you learn and share it with others.",
            ].map((step, i) => (
              <div
                key={step}
                className="flex gap-5 rounded-2xl border border-white/10 bg-white/[.04] p-5"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#a5ff00] font-black text-[#06182b]">
                  {i + 1}
                </span>

                <p className="self-center text-white/80">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* JOIN */}
      <section
        id="join"
        className="relative isolate overflow-hidden px-5 py-24 text-center"
      >
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(6,24,43,.92),rgba(6,24,43,.96)),url('https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=1800&q=80)] bg-cover bg-center" />

        <p className="text-sm font-bold uppercase tracking-[.2em] text-[#a5ff00]">
          Your journey begins here
        </p>

        <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-black sm:text-6xl">
          Be rooted in the Word.
          <br />
          Be ready to serve.
        </h2>

        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-white/70">
          Take the first step into a structured four-month journey of Bible
          discovery, conviction and growth.
        </p>

        <Link
          href="/serve/register"
          className="mt-9 inline-block rounded-full bg-[#a5ff00] px-8 py-4 font-extrabold text-[#06182b]"
        >
          Apply to join <span aria-hidden>→</span>
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 px-5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <ServeLogoText />

          <p className="text-sm text-white/45">
            Study the Word. Live the truth. Serve with love.
          </p>
        </div>
      </footer>
    </main>
  );
}
