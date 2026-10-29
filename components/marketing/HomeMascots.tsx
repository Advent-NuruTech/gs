"use client";

import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { useState } from "react";
import styles from "./HomeMascots.module.css";

const mascots = ["laptop", "pencil", "book"] as const;

export default function HomeMascots() {
  const [paused, setPaused] = useState(false);

  return (
    <section className={styles.section} aria-label="Learn something. Earn something.">
      <div className={`${styles.scene} ${paused ? styles.paused : ""}`} aria-hidden="true">
        {mascots.map((mascot) => (
          <div key={mascot} className={`${styles.walker} ${styles[mascot]}`}>
            <div className={styles.character}>
              <span className={`${styles.leg} ${styles.leftLeg}`} />
              <span className={`${styles.leg} ${styles.rightLeg}`} />
              <Image src={`/images/mascot-${mascot}.webp`} alt="" width={120} height={120} className={styles.body} />
            </div>
          </div>
        ))}
      </div>
      <p className="text-center text-base font-black text-blue-700 dark:text-blue-300 sm:text-lg">Learn something. Earn something.</p>
      <button type="button" onClick={() => setPaused((value) => !value)} className="mx-auto mt-2 flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:text-slate-300 dark:hover:bg-slate-800 motion-reduce:hidden" aria-label={paused ? "Resume character animation" : "Pause character animation"}>
        {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}{paused ? "Play" : "Pause"}
      </button>
    </section>
  );
}
