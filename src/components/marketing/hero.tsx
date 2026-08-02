import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { DotGrid } from './fx/dot-grid';
import { SplitReveal } from './fx/split-reveal';
import { Magnetic } from './fx/magnetic';

export function Hero() {
  return (
    <section className="relative flex min-h-[92vh] items-center overflow-hidden">
      <DotGrid />

      {/* warm wash for depth + text legibility — above the grid, below content */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            'radial-gradient(1100px 680px at 12% 32%, var(--paper) 0%, rgba(246,241,231,0.72) 38%, transparent 66%), radial-gradient(900px 600px at 100% 100%, var(--accent-tint) 0%, transparent 55%)',
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-5 py-28 sm:px-8">
        <SplitReveal
          as="h1"
          type="chars"
          trigger="load"
          delay={0.85}
          className="max-w-4xl font-display text-[2.9rem] font-semibold leading-[1.02] text-[var(--ink)] sm:text-6xl lg:text-7xl"
        >
          A CV that fits the <span className="italic text-[var(--accent)]">German</span>{' '}
          job market.
        </SplitReveal>

        <SplitReveal
          as="p"
          type="lines"
          trigger="load"
          delay={1.25}
          className="mt-7 max-w-md text-lg leading-relaxed text-[var(--ink-soft)] sm:text-xl"
        >
          Build your profile once. Lackey shapes it into a proper Lebenslauf,
          ATS-friendly cover letters, and tailored applications for Germany.
        </SplitReveal>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Magnetic strength={0.5}>
            <Link
              href="/dashboard"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-7 py-4 text-base font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_16px_34px_-12px_rgba(46,92,70,0.6)] transition-colors duration-200 hover:bg-[var(--accent-ink)]"
            >
              Open workspace
              <ArrowRight
                weight="bold"
                className="h-[1.05rem] w-[1.05rem] transition-transform duration-200 group-hover:translate-x-1"
              />
            </Link>
          </Magnetic>
          <a
            href="#how"
            className="inline-flex items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper)]/70 px-7 py-4 text-base font-medium text-[var(--ink)] backdrop-blur-sm transition-colors hover:border-[var(--ink-soft)]/40 hover:bg-[var(--paper-2)]"
          >
            See how it works
          </a>
        </div>
      </div>
    </section>
  );
}
