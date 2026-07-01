'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import {
  UserCirclePlus,
  ClipboardText,
  MagicWand,
  PaperPlaneTilt,
} from '@phosphor-icons/react/dist/ssr';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const STEPS = [
  {
    n: '01',
    Icon: UserCirclePlus,
    title: 'Build your profile',
    body: 'Add your experience, education and skills once. This becomes your Skeleton.',
  },
  {
    n: '02',
    Icon: ClipboardText,
    title: 'Paste a job description',
    body: 'Drop in a link or the full text. Lackey reads what the role actually needs.',
  },
  {
    n: '03',
    Icon: MagicWand,
    title: 'Review the tailored draft',
    body: 'Lackey suggests changes for the role and country. You accept the ones you like.',
  },
  {
    n: '04',
    Icon: PaperPlaneTilt,
    title: 'Apply and track',
    body: 'Export an ATS-safe CV and cover letter. The application lands in your tracker.',
  },
] as const;

export function HowItWorks() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // ---- Desktop (>=768px), motion allowed: pin + scrubbed flip/reveal ----
      mm.add(
        '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
        () => {
          const header = root.current!.querySelector('.hiw-header');
          const cards = gsap.utils.toArray<HTMLElement>('.hiw-card');

          // Pre-flip + grouped start state (set here, never in JSX, so a
          // no-JS / SSR render shows every card fully readable).
          gsap.set('.hiw-row', { gap: 0 });
          gsap.set(header, { y: 36, opacity: 0 });
          gsap.set(cards, {
            opacity: 0,
            rotationY: -90,
            y: 40,
            transformOrigin: '50% 50%',
          });

          // One scrubbed timeline driven by the pin. Cards reveal one by one
          // (staggered windows), then the row opens its gap.
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: root.current,
              start: 'top top',
              end: () => `+=${window.innerHeight * 3}`,
              scrub: 1,
              pin: true,
              pinSpacing: true,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });

          tl.to(header, { y: 0, opacity: 1, ease: 'power2.out', duration: 1 })
            .to(
              cards,
              {
                opacity: 1,
                rotationY: 0,
                y: 0,
                ease: 'power3.out',
                duration: 1.4,
                stagger: 0.5,
              },
              0.4,
            )
            .to('.hiw-row', { gap: 24, ease: 'power2.out', duration: 1 }, '>-0.4');

          return () => {
            tl.scrollTrigger?.kill();
            tl.kill();
          };
        },
      );

      // ---- Mobile (<768px), motion allowed: no pin, staggered fade/rise ----
      mm.add(
        '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
        () => {
          const cards = gsap.utils.toArray<HTMLElement>('.hiw-card');
          const triggers = cards.map((card) =>
            gsap.from(card, {
              opacity: 0,
              y: 28,
              duration: 0.6,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: card,
                start: 'top 85%',
                toggleActions: 'play none none none',
              },
            }),
          );
          return () => triggers.forEach((t) => t.scrollTrigger?.kill());
        },
      );

      // Reduced motion (any width): no matchMedia branch fires, so the static
      // JSX below renders fully visible and readable. Nothing to do.

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="how"
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden bg-[var(--paper-2)]/50"
    >
      <div className="mx-auto w-full max-w-[1200px] px-5 py-20 sm:px-8 md:py-0">
        <div className="hiw-header mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold leading-tight text-[var(--ink)] sm:text-4xl lg:text-[2.7rem]">
            From blank page to sent application.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-[var(--ink-soft)]">
            Four steps, and the first one is the only time you write anything
            from scratch.
          </p>
        </div>

        <ol
          className="hiw-row mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 md:mt-14 md:grid-cols-4"
          style={{ perspective: '1200px' }}
        >
          {STEPS.map(({ n, Icon, title, body }) => (
            <li
              key={n}
              className="hiw-card flex flex-col rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[0_18px_44px_-30px_rgba(20,35,28,0.5)] [backface-visibility:hidden] sm:p-7"
            >
              <span className="font-display text-4xl font-semibold leading-none text-[var(--accent)]">
                {n}
              </span>
              <Icon
                className="mt-6 h-8 w-8 text-[var(--accent)]"
                weight="duotone"
                aria-hidden
              />
              <h3 className="mt-4 font-display text-xl font-semibold text-[var(--ink)]">
                {title}
              </h3>
              <p className="mt-2 text-[0.98rem] leading-relaxed text-[var(--ink-soft)]">
                {body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
