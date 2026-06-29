export function Companion() {
  return (
    <section className="relative overflow-hidden bg-[var(--espresso)]">
      {/* full-bleed photo, graded into the espresso palette so text stays readable */}
      {/* eslint-disable-next-line @next/next/no-img-element -- picsum placeholder, swap for a local /public asset */}
      <img
        src="https://picsum.photos/seed/lackey-companion-hopeful-cafe/1800/1000"
        alt=""
        aria-hidden="true"
        width={1800}
        height={1000}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover opacity-30"
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(42,32,26,0.82), rgba(42,32,26,0.92)), radial-gradient(900px 500px at 80% 0%, rgba(200,73,43,0.28), transparent 60%)',
        }}
      />

      <div className="relative mx-auto max-w-3xl px-5 py-24 text-center sm:px-8 md:py-32">
        <h2 className="reveal font-display text-3xl font-semibold leading-tight text-[#faf3ea] sm:text-4xl lg:text-[2.9rem]">
          A hard search deserves a{' '}
          <span className="text-[var(--accent)]">calmer</span> process.
        </h2>
        <p className="reveal mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[#e7d8c9]">
          Applying across Europe means new rules, new formats and a lot of
          starting over. Lackey keeps your story straight and handles the tedious
          parts, so your energy goes where it actually counts: the conversations
          that get you hired.
        </p>
      </div>
    </section>
  );
}
