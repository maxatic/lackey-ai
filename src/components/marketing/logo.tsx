/**
 * Lackey AI wordmark + mark.
 * The mark is a single simple geometric tile (rounded square, accent fill) with
 * an "L" and a small companion "spark" dot. Kept deliberately minimal.
 */

export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={className}
      width={40}
      height={40}
    >
      <rect width="40" height="40" rx="11" fill="var(--accent)" />
      {/* L */}
      <path
        d="M14 10.5v15.5h11"
        fill="none"
        stroke="#fff"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* companion spark */}
      <circle cx="28.5" cy="13" r="2.7" fill="#fff" />
    </svg>
  );
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-8 w-8 shrink-0" />
      <span className="font-display text-[1.35rem] font-semibold tracking-tight text-[var(--ink)]">
        Lackey AI
      </span>
    </span>
  );
}
