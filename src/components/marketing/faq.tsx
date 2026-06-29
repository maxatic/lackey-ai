import { CaretDown } from '@phosphor-icons/react/dist/ssr';

const FAQS = [
  {
    q: 'Which countries does Lackey handle?',
    a: 'Today: Germany, the United Kingdom, the Netherlands and France, plus the EU-wide Europass standard. Each follows its own real-world conventions for photos, personal details, length and tone. More markets are on the way.',
  },
  {
    q: 'Are the CVs actually ATS-friendly?',
    a: 'Yes, by design. Every template is single-column with a real text layer and standard fonts, with nothing hidden in graphics or headers. That is exactly what applicant tracking systems can read, so your CV reaches a human.',
  },
  {
    q: 'Do I need to know LaTeX or design?',
    a: 'No. You fill in your profile in plain language. Lackey handles the layout, the formatting and the locale rules, and gives you a polished PDF to download.',
  },
  {
    q: 'Is my profile private?',
    a: 'Your Skeleton is yours. It exists to build your applications, and you stay in control of what gets generated and exported. Nothing is shared without you asking for it.',
  },
  {
    q: 'Is it really free to start?',
    a: 'The core is free: your profile, a master CV in every supported format, a tailored CV and cover letter, and the tracker. No card required to begin.',
  },
];

export function Faq() {
  return (
    <section className="bg-[var(--paper)]">
      <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 md:py-28">
        <h2 className="font-display text-3xl font-semibold leading-tight text-[var(--ink)] sm:text-4xl lg:text-[2.6rem]">
          The questions you are probably asking.
        </h2>

        <div className="mt-10 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="group py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left">
                <span className="font-display text-lg font-semibold text-[var(--ink)]">
                  {q}
                </span>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--line)] text-[var(--ink-soft)] transition-transform duration-200 group-open:rotate-180">
                  <CaretDown weight="bold" className="h-4 w-4" />
                </span>
              </summary>
              <p className="max-w-2xl pb-6 pr-12 text-[1.02rem] leading-relaxed text-[var(--ink-soft)]">
                {a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
