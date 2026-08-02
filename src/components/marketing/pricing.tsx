import Link from 'next/link';
import { Check, ArrowRight } from '@phosphor-icons/react/dist/ssr';

const FREE = [
  'Your full Skeleton profile',
  'A master CV in every EU format',
  'A tailored CV and cover letter per job',
  'Your application tracker',
];

const PLUS = [
  'Unlimited tailored CVs',
  'Several cover-letter angles per role',
  'Interview question bank by role',
  'Spoken mock interviews, when they land',
];

export function Pricing() {
  return (
    <section id="pricing" className="bg-[var(--paper-2)]/50">
      <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold leading-tight text-[var(--ink)] sm:text-4xl lg:text-[2.7rem]">
            Start free. Pay only if it earns its keep.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-[var(--ink-soft)]">
            The whole core is free, because looking for work is expensive enough.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-5 md:grid-cols-2">
          {/* Free */}
          <div className="reveal flex flex-col rounded-3xl border-2 border-[var(--accent)] bg-[var(--paper)] p-7 shadow-[0_24px_50px_-30px_rgba(46,92,70,0.4)] sm:p-8">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-xl font-semibold text-[var(--ink)]">
                Free
              </h3>
              <span className="text-sm font-medium text-[var(--accent-ink)]">
                Free forever
              </span>
            </div>
            <p className="mt-1 font-display text-4xl font-semibold text-[var(--ink)]">
              €0
            </p>
            <ul className="mt-6 flex-1 space-y-3">
              {FREE.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check
                    weight="bold"
                    className="mt-1 h-4 w-4 shrink-0 text-[var(--accent)]"
                  />
                  <span className="text-[0.98rem] text-[var(--ink)]">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/dashboard"
              className="group mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3.5 text-base font-semibold text-white transition-all duration-200 hover:bg-[var(--accent-ink)] active:translate-y-px"
            >
              Open workspace
              <ArrowRight
                weight="bold"
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
              />
            </Link>
          </div>

          {/* Plus */}
          <div className="reveal flex flex-col rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-7 sm:p-8">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-xl font-semibold text-[var(--ink)]">
                Plus
              </h3>
              <span className="rounded-full bg-[var(--paper-2)] px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
                Coming soon
              </span>
            </div>
            <p className="mt-1 font-display text-4xl font-semibold text-[var(--ink-soft)]">
              Later
            </p>
            <ul className="mt-6 flex-1 space-y-3">
              {PLUS.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check
                    weight="bold"
                    className="mt-1 h-4 w-4 shrink-0 text-[var(--ink-soft)]"
                  />
                  <span className="text-[0.98rem] text-[var(--ink)]">{f}</span>
                </li>
              ))}
            </ul>
            <p className="mt-7 rounded-full border border-dashed border-[var(--line)] px-6 py-3.5 text-center text-[0.95rem] font-medium text-[var(--ink-soft)]">
              Start free today, and you are first in line.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
