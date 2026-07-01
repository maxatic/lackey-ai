import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center gap-5 bg-[var(--paper)] p-8 text-center">
      <p className="font-display text-[clamp(5rem,18vw,9rem)] font-semibold leading-none tracking-tight text-[var(--accent)]">
        404
      </p>
      <h1 className="font-display text-2xl font-semibold text-[var(--ink)]">
        This page went missing.
      </h1>
      <p className="max-w-sm text-[var(--ink-soft)]">
        The page you are looking for does not exist or has moved.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-ink)]"
      >
        Back home
      </Link>
    </main>
  );
}
