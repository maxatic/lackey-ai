import type { Metadata } from 'next';
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google';
import { AuthHeader } from '@/components/auth-header';
import { PostHogProvider } from '@/components/posthog-provider';
import './globals.css';

const body = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  style: ['normal', 'italic'],
  axes: ['opsz'],
});

export const metadata: Metadata = {
  title: 'Lackey AI',
  description: 'Your AI companion for the German job-seeking journey.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body>
        <PostHogProvider>
          <AuthHeader />
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}
