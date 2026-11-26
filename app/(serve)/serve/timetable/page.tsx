
import Link from "next/link";

const studies = [
  "The Bible — God's Inspired Word",
  "How to Study the Bible",
  "God — Who Is He?",
  "Jesus Christ — Our Saviour",
  "The Holy Spirit",
  "Creation and the Origin of Life",
  "The Origin of Sin and the Great Controversy",
  "The Fall of Man and the Consequences of Sin",
  "God's Plan of Salvation",
  "Faith, Repentance and Conversion",
  "Baptism and the New Birth",
  "The Ten Commandments — God's Law",
  "The Sabbath — God's Holy Day",
  "The True Church of God",
  "The Remnant Church and Its Mission",
  "The Spirit of Prophecy",
  "Death — What Happens When We Die?",
  "The Resurrection",
  "Hell and the Final Destruction of Sin",
  "The Second Coming of Jesus",
  "Signs of Christ's Second Coming",
  "The Millennium",
  "The New Earth",
  "The Sanctuary — God's Plan of Redemption",
  "The Earthly Sanctuary and Its Services",
  "The Heavenly Sanctuary",
  "The Day of Atonement",
  "The Investigative Judgment",
  "The 2300 Days and 1844",
  "The Three Angels' Messages",
  "The Mark of the Beast",
  "The Seal of God",
  "Babylon and the Fall of Babylon",
  "Sunday Worship and the Sabbath Controversy",
  "The Final Crisis",
  "Christian Stewardship",
  "Prayer and the Christian Life",
  "Christian Health and Temperance",
  "The Gift of Evangelism and Christian Service",
  "Preparing to Meet Jesus",
];

export default function TimetablePage() {
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

          <Link
            href="/serve"
            className="rounded-full border border-white/20 px-5 py-2 text-sm font-bold text-white transition hover:border-[#a5ff00] hover:text-[#a5ff00]"
          >
            Home
          </Link>
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
            <span className="text-[#a5ff00]">40</span> Bible Studies
          </h1>

          <p className="mt-6 max-w-2xl text-xl font-bold leading-relaxed text-white sm:text-2xl">
            A journey from the foundations of Scripture to a firm understanding
            of Present Truth.
          </p>

          <p className="mt-5 max-w-xl leading-7 text-white/65">
            Explore the complete learning timetable of SERVE* If Saved.
            Forty studies designed to build conviction, understanding,
            spiritual growth and readiness for Christian service.
          </p>

          <div className="mt-10 flex flex-wrap gap-6">
            <div>
              <p className="text-3xl font-black text-[#a5ff00]">40</p>
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
              message entrusted to God's people.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {studies.map((study, index) => (
              <article
                key={study}
                className="group flex items-start gap-4 rounded-2xl border border-[#06182b]/10 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#06182b] text-sm font-black text-[#a5ff00] transition group-hover:bg-[#a5ff00] group-hover:text-[#06182b]">
                  {(index + 1).toString().padStart(2, "0")}
                </div>

                <div className="pt-1">
                  <p className="text-xs font-black uppercase tracking-widest text-[#0788dc]">
                    Bible Study {index + 1}
                  </p>

                  <h3 className="mt-2 font-bold leading-6 text-[#06182b]">
                    {study}
                  </h3>
                </div>
              </article>
            ))}
          </div>

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
