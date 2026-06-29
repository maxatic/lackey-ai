'use client';

import { useRef, useEffect, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const useIso = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Infinite horizontal marquee that subtly speeds up with scroll velocity.
 * Reduced-motion: renders a static, wrapped row.
 */
export function Marquee({
  items,
  className = '',
}: {
  items: string[];
  className?: string;
}) {
  const track = useRef<HTMLDivElement>(null);

  useIso(() => {
    const el = track.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.registerPlugin(ScrollTrigger);
    const tween = gsap.to(el, {
      xPercent: -50,
      repeat: -1,
      ease: 'none',
      duration: Math.max(20, items.length * 3.4),
    });

    let idle: ReturnType<typeof setTimeout>;
    const st = ScrollTrigger.create({
      onUpdate: (self) => {
        const boost = 1 + gsap.utils.clamp(0, 5, Math.abs(self.getVelocity()) / 320);
        gsap.to(tween, { timeScale: boost, duration: 0.3, overwrite: true });
        clearTimeout(idle);
        idle = setTimeout(
          () => gsap.to(tween, { timeScale: 1, duration: 0.8, overwrite: true }),
          140,
        );
      },
    });

    return () => {
      clearTimeout(idle);
      st.kill();
      tween.kill();
      gsap.set(el, { clearProps: 'transform' });
    };
  }, [items.length]);

  return (
    <div className={`overflow-hidden ${className}`}>
      <div ref={track} className="flex w-max flex-nowrap will-change-transform">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>
            {items.map((it, i) => (
              <span key={i} className="flex items-center">
                <span className="whitespace-nowrap px-6 font-display text-2xl font-medium text-[var(--ink)] sm:text-3xl">
                  {it}
                </span>
                <span className="h-1.5 w-1.5 rotate-45 bg-[var(--accent)]" aria-hidden />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
