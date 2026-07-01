import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { AuthHeader } from '@/components/auth-header';
import { PostHogProvider } from '@/components/posthog-provider';
import './globals.css';

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
    <html lang="en">
      <body>
        <ClerkProvider>
          <PostHogProvider>
            <AuthHeader />
            {children}
          </PostHogProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
