import { Hero } from '@/components/marketing/hero';
import { Marquee } from '@/components/marketing/fx/marquee';
import { CvFormats } from '@/components/marketing/cv-formats';
import { SkeletonSection } from '@/components/marketing/skeleton-section';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { Features } from '@/components/marketing/features';
import { Companion } from '@/components/marketing/companion';
import { Pricing } from '@/components/marketing/pricing';
import { Faq } from '@/components/marketing/faq';

const FORMATS = [
  'German Lebenslauf',
  'UK CV',
  'Dutch CV',
  'CV français',
  'Europass',
  'ATS-safe',
  'One profile',
];

export default function LandingPage() {
  return (
    <>
      <Hero />
      <section
        aria-label="Formats Lackey speaks"
        className="border-y border-[var(--line)]/70 bg-[var(--paper-2)]/50 py-7"
      >
        <Marquee items={FORMATS} />
      </section>
      <CvFormats />
      <SkeletonSection />
      <HowItWorks />
      <Features />
      <Companion />
      <Pricing />
      <Faq />
    </>
  );
}
