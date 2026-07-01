export function Companion() {
  return (
    <section className="relative overflow-hidden bg-[var(--espresso)]">
      {/* TODO: swap this gradient for a local /public brand photo once available */}
      {/* ponytail: CSS gradient placeholder — no external hotlink, looks intentional */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 120% 80% at 65% 40%, rgba(46,92,70,0.18) 0%, rgba(99,112,95,0.22) 45%, transparent 80%), linear-gradient(135deg, rgba(99,112,95,0.15) 0%, rgba(20,35,28,0.0) 100%)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(20,35,28,0.82), rgba(20,35,28,0.92)), radial-gradient(900px 500px at 80% 0%, rgba(46,92,70,0.28), transparent 60%)',
        }}
      />

      <div className="relative mx-auto max-w-3xl px-5 py-24 text-center sm:px-8 md:py-32">
        <h2 className="reveal font-display text-3xl font-semibold leading-tight text-[#f2eee1] sm:text-4xl lg:text-[2.9rem]">
          A hard search deserves a{' '}
          <span className="italic text-[#9ec7ab]">calmer</span> process.
        </h2>
        <p className="reveal mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[#cfd6c4]">
          Applying across Europe means new rules, new formats and a lot of
          starting over. Lackey keeps your story straight and handles the tedious
          parts, so your energy goes where it actually counts: the conversations
          that get you hired.
        </p>
      </div>
    </section>
  );
}
