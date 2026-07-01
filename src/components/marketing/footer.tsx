'use client';

import { useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

const PRODUCT = [
  { href: '#formats', label: 'EU formats' },
  { href: '#how', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
];

// Deep "single dark moment" close. Cream text on deep forest; AA-safe.
// #f2eee1 on #14231c ~= 13:1; the CTA inverts to cream-on-forest for contrast.
export function MarketingFooter() {
  const root = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // Motion path: SplitText char-rise on scroll + cursor-reactive glow.
      mm.add(
        '(prefers-reduced-motion: no-preference)',
        () => {
          const split = new SplitText(headingRef.current, {
            type: 'chars',
            charsClass: 'lk-foot-char',
          });
          // Each char rises inside its own clip box.
          gsap.set(split.chars, { yPercent: 125 });

          const st = ScrollTrigger.create({
            trigger: root.current,
            start: 'top 70%',
            once: true,
            onEnter: () =>
              gsap.to(split.chars, {
                yPercent: 0,
                duration: 1,
                ease: 'power3.out',
                stagger: { each: 0.035, from: 'center' },
              }),
          });

          // Cursor-reactive warm backdrop: GSAP-eased CSS vars, no scroll listener.
          const xTo = gsap.quickTo(glowRef.current, '--gx', {
            duration: 0.6,
            ease: 'power3',
          });
          const yTo = gsap.quickTo(glowRef.current, '--gy', {
            duration: 0.6,
            ease: 'power3',
          });
          const onMove = (e: PointerEvent) => {
            const r = root.current?.getBoundingClientRect();
            if (!r) return;
            xTo(((e.clientX - r.left) / r.width) * 100);
            yTo(((e.clientY - r.top) / r.height) * 100);
          };
          window.addEventListener('pointermove', onMove, { passive: true });

          return () => {
            st.kill();
            split.revert();
            window.removeEventListener('pointermove', onMove);
          };
        },
      );

      // Reduced motion: static, fully visible. (matchMedia + gsap.set is the fallback.)
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(headingRef.current, { autoAlpha: 1 });
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <footer
      ref={root}
      data-marketing
      className="relative overflow-hidden bg-[var(--espresso)] text-[#f2eee1]"
    >
      <style>{`
        .lk-foot-char { display: inline-block; will-change: transform; }
        /* clip each glyph so the rise reveals out of its own box */
        .lk-foot-h2 { overflow: hidden; }
        .lk-foot-glow {
          --gx: 50; --gy: 30;
          background: radial-gradient(
            42rem 42rem at calc(var(--gx) * 1%) calc(var(--gy) * 1%),
            rgba(126,178,142,0.22) 0%,
            rgba(126,178,142,0.10) 32%,
            transparent 66%
          );
        }
      `}</style>

      {/* cursor-reactive warm backdrop */}
      <div
        ref={glowRef}
        aria-hidden
        className="lk-foot-glow pointer-events-none absolute inset-0 -z-0"
      />

      <div className="relative mx-auto max-w-[1200px] px-5 py-20 sm:px-8 md:py-28">
        {/* Giant reveal headline + CTA */}
        <div className="max-w-3xl">
          <h2
            ref={headingRef}
            className="lk-foot-h2 font-display text-[clamp(3rem,11vw,8rem)] font-semibold leading-[0.95] tracking-tight"
          >
            Start free today.
          </h2>

          <p className="mt-6 text-lg leading-relaxed text-[#cfd6c4]">
            Your next application starts with one profile.
          </p>

          <Link
            href="/sign-up"
            className="group mt-9 inline-flex items-center justify-center gap-2 rounded-full bg-[#f2eee1] px-8 py-4 text-base font-semibold text-[var(--espresso)] shadow-[0_18px_40px_-14px_rgba(0,0,0,0.5)] transition-transform duration-200 ease-out will-change-transform hover:-translate-y-0.5 hover:scale-[1.03] active:translate-y-0"
          >
            Start free
            <span
              aria-hidden
              className="transition-transform duration-200 group-hover:translate-x-1"
            >
              &rarr;
            </span>
          </Link>
        </div>

        {/* Columns */}
        <div className="mt-20 grid grid-cols-1 gap-12 border-t border-white/10 pt-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div className="max-w-xs">
            <p className="font-display text-xl font-semibold">Lackey AI</p>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-[#a8b3a0]">
              Your second brain for the European job hunt.
            </p>
          </div>

          <nav aria-label="Product">
            <p className="text-sm font-semibold text-[#f2eee1]">Product</p>
            <ul className="mt-4 space-y-2.5">
              {PRODUCT.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="text-[0.95rem] text-[#a8b3a0] transition-colors hover:text-[#f2eee1]"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Account">
            <p className="text-sm font-semibold text-[#f2eee1]">Account</p>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link
                  href="/sign-in"
                  className="text-[0.95rem] text-[#a8b3a0] transition-colors hover:text-[#f2eee1]"
                >
                  Sign in
                </Link>
              </li>
              <li>
                <Link
                  href="/sign-up"
                  className="text-[0.95rem] text-[#a8b3a0] transition-colors hover:text-[#f2eee1]"
                >
                  Start free
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Bottom row */}
        <div className="mt-14 flex flex-col gap-2 border-t border-white/10 pt-6 text-sm text-[#8c9a88] sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; 2026 Lackey AI</p>
          <p>Made for job seekers across Europe.</p>
        </div>
      </div>
    </footer>
  );
}
