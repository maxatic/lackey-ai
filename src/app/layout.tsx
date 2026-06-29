import type { Metadata } from 'next';
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs';
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
            <header data-app-header className="flex justify-end items-center gap-4 p-4 h-16">
              <SignedOut>
                <SignInButton />
                <SignUpButton />
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </header>
            {children}
          </PostHogProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
