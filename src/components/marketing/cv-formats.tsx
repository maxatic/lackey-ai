'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { Check } from '@phosphor-icons/react/dist/ssr';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

/* Illustrative document specimens. The same person, rendered to three different
   national norms. These are stylised representations of the CV artifact itself,
   not screenshots of any product UI. Sample content is clearly placeholder. */

function SheetLines({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mt-2 space-y-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-1.5 rounded-full bg-[var(--line)]"
          style={{ width: `${92 - i * 14}%` }}
        />
      ))}
    </div>
  );
}

function SheetLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 text-[0.7rem] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
      {children}
    </p>
  );
}

function GermanSheet() {
  return (
    <div className="w-[15.5rem] rounded-xl border border-[var(--line)] bg-white p-4 shadow-[0_24px_50px_-24px_rgba(37,27,21,0.5)] sm:w-[17rem]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-base font-semibold text-[var(--ink)]">
            Mara Kovač
          </p>
          <p className="text-[0.7rem] text-[var(--ink-soft)]">
            Geb. 1994 · München
          </p>
        </div>
        {/* the photo German employers still expect */}
        <div className="h-12 w-10 shrink-0 rounded-md bg-[var(--accent-tint)]" />
      </div>
      <SheetLabel>Berufserfahrung</SheetLabel>
      <SheetLines rows={3} />
      <SheetLabel>Ausbildung</SheetLabel>
      <SheetLines rows={2} />
    </div>
  );
}

function UkSheet() {
  return (
    <div className="w-[15.5rem] rounded-xl border border-[var(--line)] bg-white p-4 shadow-[0_24px_50px_-24px_rgba(37,27,21,0.5)] sm:w-[17rem]">
      <p className="font-display text-base font-semibold text-[var(--ink)]">
        Mara Kovač
      </p>
      <p className="text-[0.7rem] text-[var(--ink-soft)]">
        Product Designer · London
      </p>
      <SheetLabel>Personal statement</SheetLabel>
      <SheetLines rows={2} />
      <SheetLabel>Work experience</SheetLabel>
      <SheetLines rows={3} />
    </div>
  );
}

function EuropassSheet() {
  return (
    <div className="flex w-[15.5rem] gap-2 rounded-xl border border-[var(--line)] bg-white p-4 shadow-[0_24px_50px_-24px_rgba(37,27,21,0.5)] sm:w-[17rem]">
      <div className="w-[34%] shrink-0 rounded-md bg-[var(--paper-2)] p-2">
        <div className="h-8 w-8 rounded-full bg-[var(--accent-tint)]" />
        <div className="mt-2 space-y-1">
          <div className="h-1.5 w-full rounded-full bg-[var(--line)]" />
          <div className="h-1.5 w-3/4 rounded-full bg-[var(--line)]" />
        </div>
      </div>
      <div className="flex-1">
        <p className="font-display text-sm font-semibold text-[var(--ink)]">
          Mara Kovač
        </p>
        <SheetLines rows={4} />
      </div>
    </div>
  );
}

const SHEETS = [
  { Sheet: GermanSheet, caption: 'Germany · Lebenslauf' },
  { Sheet: UkSheet, caption: 'United Kingdom · no photo, no date of birth' },
  { Sheet: EuropassSheet, caption: 'Europass · the EU standard schema' },
] as const;

const CONTRASTS = [
  'A photo and date of birth in Germany. Never either in the UK.',
  'Europass follows a strict schema. A French CV does not.',
  'Single column, real text, ATS-safe. Every time.',
];

/* Per-card motion targets. Phase 1: rise from below into a fanned scatter
   (each at a scattered offset + tilt). Phase 2: gather into a neat, slightly
   overlapping row (tilts ease toward 0). All values are % of the card itself,
   layered on top of the translate(-50%,-50%) centering. */
const FAN = [
  { x: -88, y: -18, rot: -9 }, // left, dipped, tilted out
  { x: 0, y: -42, rot: 4 }, // centre, raised
  { x: 88, y: -6, rot: 9 }, // right, dipped, tilted out
];
const ROW = [
  { x: -64, y: 0, rot: -3 }, // neat overlapping row
  { x: 0, y: -6, rot: 0 },
  { x: 64, y: 0, rot: 3 },
];
// staggered phase windows (matches the reference's offset-per-card cadence)
const P1_START = [0.0, 0.08, 0.16];
const P2_START = [0.55, 0.62, 0.69];
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

function phase(progress: number, start: number, end: number) {
  if (progress <= start) return 0;
  if (progress >= end) return 1;
  return easeOut((progress - start) / (end - start));
}

export function CvFormats() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const headline = root.current?.querySelector<HTMLElement>('.formats-h2');
      const cards = gsap.utils.toArray<HTMLElement>('.specimen');

      const mm = gsap.matchMedia();

      // Desktop: pinned scrub with rise -> fan -> gather phases.
      mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
        let split: SplitText | undefined;
        if (headline) {
          split = new SplitText(headline, { type: 'lines,chars' });
          gsap.from(split.chars, {
            yPercent: 110,
            opacity: 0,
            duration: 0.7,
            ease: 'power3.out',
            stagger: 0.012,
            scrollTrigger: { trigger: headline, start: 'top 85%' },
          });
        }

        // Opt the specimens into absolute centring so GSAP drives them from a
        // single origin (the ported technique). Default markup flows normally,
        // which keeps the SSR / no-JS / reduced-motion state fully visible.
        root.current?.setAttribute('data-anim', '');

        const st = ScrollTrigger.create({
          trigger: '.formats-stage',
          start: 'top top',
          end: () => `+=${window.innerHeight * 4}`,
          pin: '.formats-stage',
          pinSpacing: true,
          scrub: 1,
          onUpdate: (self) => {
            const p = self.progress;
            cards.forEach((card, i) => {
              const fan = FAN[i];
              const row = ROW[i];

              // Phase 1: rise from y=120 (below) to the fanned scatter.
              const p1 = phase(p, P1_START[i], 0.42);
              let x = fan.x * p1;
              let y = 120 + (fan.y - 120) * p1;
              let rot = fan.rot * p1;

              // Phase 2: gather from fan -> neat overlapping row.
              const p2 = phase(p, P2_START[i], 0.95);
              if (p2 > 0) {
                x = fan.x + (row.x - fan.x) * p2;
                y = fan.y + (row.y - fan.y) * p2;
                rot = fan.rot + (row.rot - fan.rot) * p2;
              }

              gsap.set(card, {
                xPercent: -50 + x,
                yPercent: -50 + y,
                rotation: rot,
                opacity: Math.min(1, p1 * 4),
              });
            });
          },
        });

        return () => {
          st.kill();
          split?.revert();
          gsap.set(cards, { clearProps: 'all' });
          root.current?.removeAttribute('data-anim');
        };
      });

      // Mobile: no pin. Cards live in normal flow; a gentle fade/rise as each
      // scrolls in. Fully readable, never left invisible.
      mm.add('(max-width: 767px) and (prefers-reduced-motion: no-preference)', () => {
        cards.forEach((card) => {
          gsap.from(card, {
            y: 28,
            opacity: 0,
            duration: 0.6,
            ease: 'power2.out',
            scrollTrigger: { trigger: card, start: 'top 88%' },
          });
        });
      });

      // Reduced-motion needs no branch: the default markup flows normally and
      // is fully visible, since [data-anim] is only set by the desktop branch.

      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <section
      ref={root}
      id="formats"
      className="bg-[var(--paper-2)]/60"
    >
      {/* The specimens only become absolutely centred once JS opts the section
          in via [data-anim] (desktop, motion allowed). Default flow keeps the
          SSR / no-JS / reduced-motion state fully visible and readable. */}
      <style>{`
        @media (min-width: 768px) {
          [data-anim] .formats-stage { min-height: 100svh; }
          [data-anim] .specimen {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            will-change: transform;
          }
        }
      `}</style>

      {/* Copy + contrast bullets */}
      <div className="mx-auto max-w-[1200px] px-5 pt-20 sm:px-8 md:pt-28">
        <div className="max-w-2xl">
          <h2 className="formats-h2 font-display text-3xl font-semibold leading-tight text-[var(--ink)] sm:text-4xl lg:text-[2.7rem]">
            One profile. Every European format, done right.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-[var(--ink-soft)]">
            A German <span className="text-[var(--ink)]">Lebenslauf</span> is not
            a British CV, and neither is a Europass. Lackey knows the difference,
            so your application never looks foreign to the people reading it.
          </p>
          <ul className="mt-7 grid gap-3.5 sm:grid-cols-3">
            {CONTRASTS.map((c) => (
              <li key={c} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--accent-tint)]">
                  <Check weight="bold" className="h-3.5 w-3.5 text-[var(--accent-ink)]" />
                </span>
                <span className="text-[0.95rem] leading-relaxed text-[var(--ink)]">
                  {c}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Stage: pinned on desktop (specimens fan + gather); plain stack on mobile. */}
      <div className="formats-stage relative mx-auto flex max-w-[1200px] flex-col items-center gap-8 px-5 pt-12 pb-20 sm:px-8 md:pt-0 md:pb-0">
        {SHEETS.map(({ Sheet, caption }) => (
          <div key={caption} className="specimen">
            <Sheet />
            <p className="mt-2 pl-1 text-center text-xs font-medium text-[var(--ink-soft)] md:text-left">
              {caption}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
