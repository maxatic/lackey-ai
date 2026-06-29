import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Bricolage_Grotesque } from 'next/font/google';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { Preloader } from '@/components/marketing/fx/preloader';
import { SmoothScroll } from '@/components/marketing/fx/smooth-scroll';

const body = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Lackey AI — A CV that fits the country you are applying to',
  description:
    'Your AI companion for the EU job hunt. One profile, locale-correct CVs for Germany, the UK, the Netherlands, France and Europass, cover letters that sound like you, and a tracker that keeps it all together.',
  openGraph: {
    title: 'Lackey AI — your companion for the EU job hunt',
    description:
      'Locale-correct, ATS-friendly CVs and grounded cover letters, all derived from one profile you only fill in once.',
    type: 'website',
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-marketing
      className={`${body.variable} ${display.variable} min-h-[100dvh]`}
    >
      <Preloader />
      <SmoothScroll>
        <MarketingNav />
        <main>{children}</main>
        <MarketingFooter />
      </SmoothScroll>
    </div>
  );
}
