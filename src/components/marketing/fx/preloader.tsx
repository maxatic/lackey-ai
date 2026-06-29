"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(SplitText, CustomEase, useGSAP);

const WORDMARK = "Lackey AI";
// Safety net: must outlast the JS timeline (~2.4s) but still clear fast if JS dies.
const SAFETY_MS = 2600;

export function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const [done, setDone] = useState(false);

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        setDone(true);
        return;
      }

      CustomEase.create("hop", "0.9, 0, 0.1, 1");

      const split = new SplitText(".pl-word", { type: "chars", charsClass: "pl-char", mask: "chars" });
      gsap.set(".pl-char", { yPercent: 110 });

      const counter = { v: 0 };
      const tl = gsap.timeline({
        delay: 0.15,
        onComplete: () => setDone(true),
      });

      tl.to(".pl-char", {
        yPercent: 0,
        duration: 0.9,
        ease: "hop",
        stagger: { each: 0.05, from: "random" },
      })
        .to(
          counter,
          {
            v: 100,
            duration: 1.4,
            ease: "power2.inOut",
            onUpdate: () => {
              if (counterRef.current)
                counterRef.current.textContent = String(Math.round(counter.v)).padStart(3, "0");
              if (barRef.current) barRef.current.style.transform = `scaleX(${counter.v / 100})`;
            },
          },
          0,
        )
        // Clean upward curtain wipe.
        .to(root.current, { clipPath: "inset(0 0 100% 0)", duration: 0.7, ease: "hop" }, ">-0.1");

      return () => split.revert();
    },
    { scope: root },
  );

  if (done) return null;

  return (
    <div
      ref={root}
      aria-hidden
      className="pl-root fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-[var(--paper)]"
      style={{ clipPath: "inset(0 0 0% 0)" }}
    >
      {/* CSS safety net: always clears the overlay even if the JS timeline never runs. */}
      <style>{`
        @keyframes pl-safety {
          to { clip-path: inset(0 0 100% 0); opacity: 0; pointer-events: none; visibility: hidden; }
        }
        .pl-root { animation: pl-safety 0.5s ${SAFETY_MS}ms forwards; }
        @media (prefers-reduced-motion: reduce) {
          .pl-root { animation: none; opacity: 0; visibility: hidden; pointer-events: none; }
        }
      `}</style>

      <h1 className="font-display pl-word overflow-hidden text-[clamp(2.5rem,9vw,7rem)] leading-none text-[var(--ink)]">
        {WORDMARK}
      </h1>

      <div className="flex w-[min(78vw,360px)] flex-col gap-3">
        <span className="relative h-px w-full bg-[var(--line)]">
          <span
            ref={barRef}
            className="absolute inset-0 origin-left bg-[var(--accent)]"
            style={{ transform: "scaleX(0)" }}
          />
        </span>
        <span
          ref={counterRef}
          className="font-display self-end text-sm tabular-nums tracking-wide text-[var(--accent-ink)]"
        >
          000
        </span>
      </div>
    </div>
  );
}
