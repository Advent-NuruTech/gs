"use client";

import Image from "next/image";
import Link from "next/link";
import { BookOpen, Layers3, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";

const HERO_COPY = "Discover practical courses and digital resources made to move your goals forward.";

const slides = [
  { src: "/images/hero/adventskool-learn.png", mobileSrc: "/images/hero/adventskool-learn-mobile-v2.png", alt: "Learning online with AdventSkool on a laptop" },
  { src: "/images/hero/adventskool-create.png", mobileSrc: "/images/hero/adventskool-create-mobile-v2.png", alt: "Creating digital work with a tablet and stylus" },
  { src: "/images/hero/adventskool-grow.png", mobileSrc: "/images/hero/adventskool-grow-mobile-v2.png", alt: "Learning from a phone with headphones" },
  { src: "/images/hero/adventskool-sell.png", mobileSrc: "/images/hero/adventskool-sell-mobile-v2.png", alt: "Presenting a finished digital resource on a tablet" },
] as const;

function TypewriterCopy() {
  const [copy, setCopy] = useState("");

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    let timer: ReturnType<typeof setTimeout>;
    let index = 0;
    let deleting = false;
    const tick = () => {
      index += deleting ? -1 : 1;
      setCopy(HERO_COPY.slice(0, index));
      if (!deleting && index === HERO_COPY.length) {
        deleting = true;
        timer = setTimeout(tick, 1800);
      } else if (deleting && index === 0) {
        deleting = false;
        timer = setTimeout(tick, 500);
      } else {
        timer = setTimeout(tick, deleting ? 22 : 38);
      }
    };
    timer = setTimeout(tick, 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <p className="mt-3 min-h-[4.5rem] text-sm leading-6 text-slate-600 dark:text-slate-300 sm:min-h-[3rem] sm:text-base" aria-label={HERO_COPY}>
      <span className="motion-reduce:hidden" aria-hidden="true">{copy}</span>
      <span className="hidden motion-reduce:inline" aria-hidden="true">{HERO_COPY}</span>
      <span className="ml-0.5 animate-pulse text-blue-700 motion-reduce:hidden" aria-hidden="true">|</span>
    </p>
  );
}

export default function HomeHero() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setReduceMotion(media.matches);
    syncPreference();
    media.addEventListener("change", syncPreference);
    return () => media.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    if (paused || reduceMotion) return;
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [paused, reduceMotion]);

  return (
    <section
      className="relative isolate -mx-2 overflow-hidden bg-white dark:bg-slate-950 sm:mx-0 sm:min-h-[540px] sm:bg-slate-950 sm:shadow-2xl sm:shadow-slate-950/20 lg:min-h-[500px]"
      aria-label="AdventSkool introduction"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div className="relative aspect-[4/3] w-full sm:absolute sm:inset-0 sm:h-full sm:aspect-auto">
        {slides.map((slide, index) => (
          <div key={slide.src} className={`absolute inset-0 transition-opacity duration-1000 motion-reduce:transition-none ${index === activeSlide ? "opacity-100" : "opacity-0"}`}>
            <Image
              src={slide.mobileSrc}
              alt={index === activeSlide ? slide.alt : ""}
              fill
              priority={index === 0}
              quality={100}
              sizes="100vw"
              aria-hidden={index !== activeSlide}
              className="object-cover sm:hidden"
            />
            <Image
              src={slide.src}
              alt={index === activeSlide ? slide.alt : ""}
              fill
              priority={index === 0}
              quality={100}
              sizes="(max-width: 1280px) 100vw, 1280px"
              aria-hidden={index !== activeSlide}
              className="hidden object-cover object-center sm:block"
            />
          </div>
        ))}
        <div className="absolute inset-0 hidden bg-gradient-to-r from-slate-950/45 via-slate-950/5 to-transparent sm:block" />
      </div>

      <div className="relative z-10 bg-white px-5 py-7 dark:bg-slate-900 sm:absolute sm:bottom-auto sm:left-8 sm:right-auto sm:top-1/2 sm:w-[min(31rem,48%)] sm:-translate-y-1/2 sm:p-7 sm:shadow-2xl sm:ring-1 sm:ring-black/5 sm:dark:ring-white/10 lg:left-14 lg:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">Learn. Create. Grow.</p>
        <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-5xl">
          Skills and resources for your next move.
        </h1>
        <TypewriterCopy />
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
          <Link href="/courses" className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-950/20 transition hover:bg-blue-600">
            <BookOpen className="h-4 w-4" /> Explore courses
          </Link>
          <Link href="/designs" className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 transition hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-200 dark:hover:bg-blue-900">
            <Layers3 className="h-4 w-4" /> Shop digital products
          </Link>
        </div>
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 sm:text-sm">
          <span>✓ Learn at your pace</span>
          <span>✓ Instant access</span>
          <span>✓ Built for progress</span>
        </div>
      </div>

      <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full bg-slate-950/55 p-1.5 text-white shadow-lg backdrop-blur sm:bottom-4 sm:top-auto">
        {slides.map((slide, index) => (
          <button
            key={slide.src}
            type="button"
            onClick={() => setActiveSlide(index)}
            className={`h-2.5 rounded-full transition-all ${index === activeSlide ? "w-7 bg-white" : "w-2.5 bg-white/55 hover:bg-white/80"}`}
            aria-label={`Show hero image ${index + 1}`}
            aria-current={index === activeSlide ? "true" : undefined}
          />
        ))}
        {!reduceMotion ? (
          <button
            type="button"
            onClick={() => setPaused((current) => !current)}
            className="ml-1 grid h-7 w-7 place-items-center rounded-full bg-white/15 transition hover:bg-white/25"
            aria-label={paused ? "Resume hero images" : "Pause hero images"}
          >
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>
        ) : null}
      </div>
    </section>
  );
}
