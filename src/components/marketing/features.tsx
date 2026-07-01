'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  FileMagnifyingGlass,
  PenNib,
  Kanban,
  Microphone,
} from '@phosphor-icons/react/dist/ssr';

gsap.registerPlugin(useGSAP);

const TRACKER_STAGES = ['Saved', 'Applied', 'Interview', 'Offer'];

/* Cursor-physics tuning, ported from the reference (SpencerGabor magnetic cards).
   Cards are pushed by cursor *velocity* weighted by proximity, settle back on a
   spring, and bleed a fraction of their push into neighbours. Pointer-driven
   transforms go through gsap quickTo / quickSetter only - never React state. */
const PROXIMITY_RADIUS = 460; // px: cursor must be within this of a card centre to push it
const PUSH_FORCE = 0.9; // px of displacement per px/frame of cursor velocity, at zero distance
const TILT_AMOUNT = 0.05; // deg of card rotation per px of horizontal push
const NEIGHBOR_INFLUENCE = 0.22; // fraction of a card's push that bleeds to its immediate neighbour
const MAX_PUSH = 26; // px clamp so a fast flick stays premium, not chaotic
const CURSOR_SMOOTHING = 0.72; // velocity low-pass; higher = smoother / laggier

export function Features() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // Desktop + motion-OK only: layer cursor physics on top of the static grid.
      // Mobile / touch / reduced-motion fall through to the CSS `.reveal` fade-rise
      // already defined globally, so cards stay fully visible and usable.
      mm.add(
        '(min-width: 768px) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
        () => {
          const cards = gsap.utils.toArray<HTMLElement>('.feature-card');
          if (cards.length === 0) return;

          // Springy setters: quickTo eases each transform toward its target, so
          // releasing the cursor (target -> 0) springs the card home for free.
          const toX = cards.map((c) =>
            gsap.quickTo(c, 'x', { duration: 0.7, ease: 'elastic.out(1, 0.55)' }),
          );
          const toY = cards.map((c) =>
            gsap.quickTo(c, 'y', { duration: 0.7, ease: 'elastic.out(1, 0.55)' }),
          );
          const toR = cards.map((c) =>
            gsap.quickTo(c, 'rotation', { duration: 0.7, ease: 'elastic.out(1, 0.55)' }),
          );
          // Spotlight position (CSS vars) + its fade, per card.
          const setMx = cards.map((c) => gsap.quickSetter(c, '--mx', 'px'));
          const setMy = cards.map((c) => gsap.quickSetter(c, '--my', 'px'));
          const setGlow = cards.map((c) => gsap.quickSetter(c, '--glow'));

          const cursor = { x: 0, y: 0, vx: 0, vy: 0, inside: false };
          let prevX = 0;
          let prevY = 0;
          let primed = false; // ignore the first move's huge delta

          const onMove = (e: PointerEvent) => {
            if (primed) {
              cursor.vx =
                cursor.vx * CURSOR_SMOOTHING +
                (e.clientX - prevX) * (1 - CURSOR_SMOOTHING);
              cursor.vy =
                cursor.vy * CURSOR_SMOOTHING +
                (e.clientY - prevY) * (1 - CURSOR_SMOOTHING);
            }
            primed = true;
            cursor.x = prevX = e.clientX;
            cursor.y = prevY = e.clientY;
            cursor.inside = true;
          };
          const onLeave = () => {
            cursor.vx = cursor.vy = 0;
            cursor.inside = false;
          };

          const host = root.current!;
          host.addEventListener('pointermove', onMove);
          host.addEventListener('pointerleave', onLeave);

          // Only run the per-frame ticker while Features is in view — same
          // pattern as dot-grid.tsx. Saves CPU/heat when scrolled past.
          let isInView = false;
          const io = new IntersectionObserver(
            ([entry]) => { isInView = entry.isIntersecting; },
            { threshold: 0 },
          );
          io.observe(host);

          const tick = () => {
            if (!isInView) return;
            // Per-card push from cursor velocity, weighted by proximity. Mirrors
            // calculatePushForce() in the source: weight = (1 - d/R)^3.
            const speed = Math.hypot(cursor.vx, cursor.vy);
            const forces = cards.map((card) => {
              if (!cursor.inside || speed < 0.5) return { fx: 0, fy: 0 };
              const r = card.getBoundingClientRect();
              const cx = r.left + r.width / 2;
              const cy = r.top + r.height / 2;
              const dist = Math.hypot(cursor.x - cx, cursor.y - cy);
              if (dist > PROXIMITY_RADIUS) return { fx: 0, fy: 0 };
              const weight = (1 - dist / PROXIMITY_RADIUS) ** 3;
              return {
                fx: cursor.vx * PUSH_FORCE * weight,
                fy: cursor.vy * PUSH_FORCE * weight,
              };
            });

            cards.forEach((_, i) => {
              // Neighbour influence: linear-index falloff, like the source.
              let fx = forces[i].fx;
              let fy = forces[i].fy;
              forces.forEach((f, j) => {
                if (j === i) return;
                const falloff = NEIGHBOR_INFLUENCE ** Math.abs(j - i);
                fx += f.fx * falloff;
                fy += f.fy * falloff * 0.6;
              });
              fx = gsap.utils.clamp(-MAX_PUSH, MAX_PUSH, fx);
              fy = gsap.utils.clamp(-MAX_PUSH, MAX_PUSH, fy);

              toX[i](fx);
              toY[i](fy);
              toR[i](gsap.utils.clamp(-3, 3, fx * TILT_AMOUNT));

              // Spotlight follows the cursor within each card; fades out when far.
              const r = cards[i].getBoundingClientRect();
              setMx[i](cursor.x - r.left);
              setMy[i](cursor.y - r.top);
              const near =
                cursor.inside &&
                cursor.x >= r.left - 40 &&
                cursor.x <= r.right + 40 &&
                cursor.y >= r.top - 40 &&
                cursor.y <= r.bottom + 40;
              setGlow[i](near ? 1 : 0);
            });
          };

          gsap.ticker.add(tick);

          return () => {
            gsap.ticker.remove(tick);
            io.disconnect();
            host.removeEventListener('pointermove', onMove);
            host.removeEventListener('pointerleave', onLeave);
            // Drop the inline transforms so the static grid is clean again.
            gsap.set(cards, { clearProps: 'transform,--mx,--my,--glow' });
          };
        },
      );

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} id="features" className="bg-[var(--paper)]">
      {/* Spotlight: a soft terracotta radial that tracks the cursor inside each
          card. --mx/--my/--glow are driven by gsap; defaults keep it invisible
          and harmless during SSR and on touch / reduced-motion. */}
      <style>{`
        .feature-card {
          --mx: 50%;
          --my: 50%;
          --glow: 0;
          will-change: transform;
        }
        .feature-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          opacity: var(--glow);
          transition: opacity 0.4s ease;
          background: radial-gradient(
            260px circle at var(--mx) var(--my),
            rgba(46, 92, 70, 0.14),
            transparent 65%
          );
        }
      `}</style>

      <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 md:py-28">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-semibold leading-tight text-[var(--ink)] sm:text-4xl lg:text-[2.7rem]">
            Everything the search needs, in one calm place.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-[var(--ink-soft)]">
            The applications, the documents, the follow-ups. All derived from your
            profile, all in one tab.
          </p>
        </div>

        {/* Tidy 2x2 on desktop, single column on mobile. */}
        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* A - Tailored CV */}
          <article className="reveal feature-card relative flex flex-col rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-7 shadow-[0_18px_40px_-28px_rgba(20,35,28,0.45)] sm:p-8">
            <FileMagnifyingGlass
              className="h-9 w-9 text-[var(--accent)]"
              weight="duotone"
            />
            <h3 className="mt-4 font-display text-xl font-semibold text-[var(--ink)] sm:text-2xl">
              A CV tailored to the job in front of you
            </h3>
            <p className="mt-2 text-[1.02rem] leading-relaxed text-[var(--ink-soft)]">
              Paste a job description and Lackey suggests what to emphasise,
              reorder or trim, drawn entirely from your real experience. You
              approve every change.
            </p>
          </article>

          {/* B - Cover letters */}
          <article className="reveal feature-card relative flex flex-col rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-7 shadow-[0_18px_40px_-28px_rgba(20,35,28,0.45)] sm:p-8">
            <PenNib className="h-9 w-9 text-[var(--accent)]" weight="duotone" />
            <h3 className="mt-4 font-display text-xl font-semibold text-[var(--ink)] sm:text-2xl">
              Cover letters grounded in your story
            </h3>
            <p className="mt-2 text-[1.02rem] leading-relaxed text-[var(--ink-soft)]">
              Never from a blank page. Lackey drafts from your profile and the
              role, so it reads like you on a good day, not a template.
            </p>
          </article>

          {/* C - Tracker (tinted, status pills) */}
          <article className="reveal feature-card relative flex flex-col rounded-3xl border border-[var(--line)] bg-[var(--paper-2)]/60 p-7 shadow-[0_18px_40px_-28px_rgba(20,35,28,0.45)] sm:p-8">
            <Kanban className="h-9 w-9 text-[var(--accent)]" weight="duotone" />
            <h3 className="mt-4 font-display text-xl font-semibold text-[var(--ink)] sm:text-2xl">
              Your whole search on one board
            </h3>
            <p className="mt-2 text-[1.02rem] leading-relaxed text-[var(--ink-soft)]">
              Every CV you generate seeds a tracker entry automatically, from
              saved to offer.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {TRACKER_STAGES.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-3 py-1 text-xs font-medium text-[var(--ink-soft)]"
                >
                  {s}
                </span>
              ))}
            </div>
          </article>

          {/* D - Interview prep (accent-tint, coming soon) */}
          <article className="reveal feature-card relative flex flex-col rounded-3xl border border-[var(--accent-tint)] bg-[var(--accent-tint)]/55 p-7 shadow-[0_18px_40px_-28px_rgba(31,68,51,0.35)] sm:p-8">
            <div className="flex items-center gap-3">
              <Microphone
                className="h-9 w-9 text-[var(--accent-ink)]"
                weight="duotone"
              />
              <span className="rounded-full bg-[var(--accent)] px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-white">
                Coming soon
              </span>
            </div>
            <h3 className="mt-4 font-display text-xl font-semibold text-[var(--ink)] sm:text-2xl">
              Interview prep, when you reach that stage
            </h3>
            <p className="mt-2 text-[1.02rem] leading-relaxed text-[var(--ink-soft)]">
              A question bank by role and company, with spoken mock interviews
              arriving later.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
