import type { Metadata } from 'next';
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
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
  description: 'Your AI companion for the EU job-seeking journey.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body>
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: '#2e5c46',
              colorText: '#1e2a23',
              colorBackground: '#fdfaf2',
              borderRadius: '0.7rem',
              fontFamily: 'var(--font-body), ui-sans-serif, system-ui, sans-serif',
            },
          }}
        >
          <PostHogProvider>
            <AuthHeader />
            {children}
          </PostHogProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
