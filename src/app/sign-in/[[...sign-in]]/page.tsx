import Link from 'next/link';
import { SignIn } from '@clerk/nextjs';
import { Logo } from '@/components/marketing/logo';

export default function SignInPage() {
  return (
    <main
      data-auth
      className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-[var(--paper)] px-5 py-12"
    >
      <Link href="/" aria-label="Lackey AI home">
        <Logo />
      </Link>
      <SignIn />
      <p className="text-sm text-[var(--ink-soft)]">
        New here?{' '}
        <Link
          href="/sign-up"
          className="font-medium text-[var(--accent)] underline underline-offset-4 hover:text-[var(--accent-ink)]"
        >
          Start free
        </Link>
      </p>
    </main>
  );
}
