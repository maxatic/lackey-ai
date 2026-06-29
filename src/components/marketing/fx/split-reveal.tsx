'use client';

import { useRef, useEffect, useLayoutEffect, type ElementType } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

const useIso = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

type Props = {
  children: React.ReactNode;
  as?: ElementType;
  type?: 'lines' | 'chars' | 'words';
  className?: string;
  trigger?: 'load' | 'scroll';
  delay?: number;
  stagger?: number;
};

/**
 * Reusable SplitText reveal: text rises and unmasks line-by-line (or char/word).
 * Runs in a layout effect so the initial hidden state is set before paint (no flash).
 * Reduced-motion: leaves the text fully visible and untouched.
 */
export function SplitReveal({
  children,
  as: Tag = 'div',
  type = 'lines',
  className = '',
  trigger = 'scroll',
  delay = 0,
  stagger,
}: Props) {
  const ref = useRef<HTMLElement>(null);

  useIso(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.registerPlugin(ScrollTrigger, SplitText);

    const splitType =
      type === 'chars' ? 'lines,chars' : type === 'words' ? 'lines,words' : 'lines';
    const split = new SplitText(el, { type: splitType, mask: 'lines' });
    const targets =
      type === 'chars' ? split.chars : type === 'words' ? split.words : split.lines;

    const tween = gsap.from(targets, {
      yPercent: 116,
      opacity: 0,
      rotation: type === 'lines' ? 0 : 2.5,
      transformOrigin: '0% 100%',
      duration: 0.9,
      ease: 'power3.out',
      stagger: stagger ?? (type === 'chars' ? 0.016 : 0.1),
      delay: trigger === 'load' ? delay : 0,
      scrollTrigger:
        trigger === 'scroll'
          ? { trigger: el, start: 'top 88%', once: true }
          : undefined,
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      split.revert();
    };
  }, [trigger, type]);

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
