"use client";

import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { DEFAULT_MASCOT_MESSAGES } from "@/lib/homeMascotMessages";
import { getHomeMascotMessages } from "@/services/homeMascotMessagesService";
import styles from "./HomeMascots.module.css";

const mascots = ["laptop", "pencil", "book"] as const;

export default function HomeMascots() {
  const [paused, setPaused] = useState(false);
  const [messages, setMessages] = useState(DEFAULT_MASCOT_MESSAGES);
  const [messageIndex, setMessageIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    let active = true;
    void getHomeMascotMessages().then((saved) => { if (active) setMessages(saved); }).catch(() => { /* Keep the built-in welcome messages available. */ });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion) return;
    const timer = window.setInterval(() => setMessageIndex((index) => index + 1), 6000);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion]);

  return (
    <section className={styles.section} aria-label="Learn something. Earn something.">
      <div className={`${styles.scene} ${paused ? styles.paused : ""}`} aria-hidden="true">
        {mascots.map((mascot, index) => (
          <div key={mascot} className={`${styles.walker} ${styles[mascot]}`}>
            {index === messageIndex % mascots.length ? <span key={messageIndex} className={`${styles.bubble} ${styles[`${mascot}Bubble`]}`}>{messages[messageIndex % messages.length]}</span> : null}
            <span className={`${styles.footprint} ${styles.firstPrint}`} />
            <span className={`${styles.footprint} ${styles.secondPrint}`} />
            <span className={`${styles.footprint} ${styles.thirdPrint}`} />
            <div className={styles.character}>
              <span className={`${styles.leg} ${styles.leftLeg}`} />
              <span className={`${styles.leg} ${styles.rightLeg}`} />
              <Image src={`/images/mascot-${mascot}.webp`} alt="" width={120} height={120} className={styles.body} />
            </div>
          </div>
        ))}
      </div>
      <p className="sr-only">{messages[messageIndex % messages.length]}</p>
      <p className="text-center text-base font-black text-blue-700 sm:text-lg">Learn something. Earn something.</p>
      <button type="button" onClick={() => setPaused((value) => !value)} className="mx-auto mt-2 flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 motion-reduce:hidden" aria-label={paused ? "Resume character animation" : "Pause character animation"}>
        {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}{paused ? "Play" : "Pause"}
      </button>
    </section>
  );
}
