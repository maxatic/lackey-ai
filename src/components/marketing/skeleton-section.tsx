'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import {
  Briefcase,
  GraduationCap,
  Sparkle,
  FolderSimple,
  FileText,
  EnvelopeSimple,
  Kanban,
} from '@phosphor-icons/react/dist/ssr';

gsap.registerPlugin(ScrollTrigger, SplitText);

/* The four profile facts that scatter in and assemble into the Skeleton card.
   `from` = scattered start offset (in % of the card box) the migrate animates out of. */
const PROFILE_ROWS = [
  { icon: Briefcase, label: 'Work experience', from: { x: '-150%', y: '-120%', r: -8 } },
  { icon: GraduationCap, label: 'Education', from: { x: '160%', y: '-90%', r: 7 } },
  { icon: Sparkle, label: 'Skills', from: { x: '-130%', y: '130%', r: 6 } },
  { icon: FolderSimple, label: 'Projects', from: { x: '150%', y: '110%', r: -7 } },
] as const;

const ARTIFACTS = [
  { icon: FileText, label: 'Tailored CV' },
  { icon: EnvelopeSimple, label: 'Cover letter' },
  { icon: Kanban, label: 'Tracker entry' },
] as const;

export function SkeletonSection() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // Desktop / motion-OK: pinned, scrubbed assembly. ----------------------
      mm.add(
        {
          isDesktop: '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
          isReduced: '(prefers-reduced-motion: reduce)',
        },
        (ctx) => {
          const { isDesktop } = ctx.conditions as { isDesktop: boolean; isReduced: boolean };

          // Reduced-motion (any width) or mobile both fall through to the static
          // path below; only the genuinely-animatable desktop case pins.
          if (!isDesktop) return;

          const rows = gsap.utils.toArray<HTMLElement>('[data-row]');
          const artifacts = gsap.utils.toArray<HTMLElement>('[data-artifact]');
          const headline = root.current!.querySelector<HTMLElement>('[data-headline]')!;
          const sub = root.current!.querySelector<HTMLElement>('[data-sub]')!;

          const split = new SplitText(headline, { type: 'words,chars' });

          // Initial scattered / hidden state.
          rows.forEach((row, i) => {
            gsap.set(row, { ...PROFILE_ROWS[i].from, scale: 1.35, opacity: 0 });
          });
          gsap.set(split.chars, { yPercent: 120, opacity: 0 });
          gsap.set([sub, ...artifacts], { y: 24, opacity: 0 });

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: root.current,
              start: 'top top',
              end: '+=' + window.innerHeight * 3,
              pin: '[data-stage]',
              scrub: 1,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });

          // Beat 1 — scattered facts migrate + scale into their card slots.
          tl.to(
            rows,
            {
              x: '0%',
              y: '0%',
              rotate: 0,
              scale: 1,
              opacity: 1,
              ease: 'power2.out',
              stagger: 0.12,
              duration: 1,
            },
            0,
          );

          // Beat 2 — headline reveals char-by-char, then the sub fades up.
          tl.to(
            split.chars,
            {
              yPercent: 0,
              opacity: 1,
              ease: 'power3.out',
              stagger: 0.4,
              duration: 1,
            },
            0.9,
          ).to(sub, { y: 0, opacity: 1, ease: 'power2.out', duration: 0.6 }, 1.5);

          // Beat 3 — derived artifacts pop out of the card with a stagger.
          tl.to(
            artifacts,
            {
              y: 0,
              opacity: 1,
              ease: 'back.out(1.6)',
              stagger: 0.18,
              duration: 0.6,
            },
            1.8,
          );

          return () => split.revert();
        },
      );
    },
    { scope: root },
  );

  return (
    <section ref={root} className="bg-[var(--paper)]">
      {/* On desktop this is the pinned stage; on mobile it is a normal block.
          Static initial styles render the fully-assembled, readable state so
          SSR / reduced-motion / mobile never show anything invisible. */}
      <div
        data-stage
        className="flex min-h-[60vh] items-center md:min-h-screen"
      >
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-14 px-5 py-20 sm:px-8 md:py-0 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Diagram */}
          <div className="reveal order-2 lg:order-1">
            <div className="mx-auto max-w-md rounded-3xl border border-[var(--line)] bg-[var(--paper-2)]/50 p-6 sm:p-8">
              {/* The Skeleton card */}
              <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_18px_40px_-28px_rgba(37,27,21,0.45)]">
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm font-semibold text-[var(--ink)]">
                    Your profile
                  </span>
                  <span className="rounded-full bg-[var(--accent-tint)] px-2.5 py-1 text-[0.7rem] font-semibold text-[var(--accent-ink)]">
                    The Skeleton
                  </span>
                </div>
                <ul className="mt-4 grid grid-cols-2 gap-2.5">
                  {PROFILE_ROWS.map(({ icon: Icon, label }) => (
                    <li
                      key={label}
                      data-row
                      className="flex items-center gap-2 rounded-xl bg-[var(--paper-2)]/70 px-3 py-2.5 will-change-transform"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-[var(--accent-ink)]" />
                      <span className="text-[0.82rem] font-medium text-[var(--ink)]">
                        {label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* connector */}
              <div aria-hidden className="flex flex-col items-center">
                <span className="h-6 w-px bg-[var(--line)]" />
                <span className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
                  derives
                </span>
                <span className="h-6 w-px bg-[var(--line)]" />
              </div>

              {/* Derived artifacts */}
              <div className="grid grid-cols-3 gap-2.5">
                {ARTIFACTS.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    data-artifact
                    className="flex flex-col items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-2 py-3 text-center will-change-transform"
                  >
                    <Icon className="h-5 w-5 text-[var(--accent)]" />
                    <span className="text-[0.72rem] font-medium leading-tight text-[var(--ink)]">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Copy */}
          <div className="order-1 max-w-xl lg:order-2">
            <h2
              data-headline
              className="font-display text-3xl font-semibold leading-tight text-[var(--ink)] sm:text-4xl lg:text-[2.7rem]"
            >
              Tell us once. Use it for every application.
            </h2>
            <p
              data-sub
              className="mt-5 text-lg leading-relaxed text-[var(--ink-soft)]"
            >
              Your experience, education, skills and projects live in one
              structured profile we call the Skeleton. Every CV and cover letter
              is built from it, so you stop copy-pasting your life into a new
              document each time.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
