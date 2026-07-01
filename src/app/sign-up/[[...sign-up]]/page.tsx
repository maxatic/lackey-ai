import Link from 'next/link';
import { SignUp } from '@clerk/nextjs';
import { Logo } from '@/components/marketing/logo';

export default function SignUpPage() {
  return (
    <main
      data-auth
      className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-[var(--paper)] px-5 py-12"
    >
      <Link href="/" aria-label="Lackey AI home">
        <Logo />
      </Link>
      <SignUp />
      <p className="text-sm text-[var(--ink-soft)]">
        Already have an account?{' '}
        <Link
          href="/sign-in"
          className="font-medium text-[var(--accent)] underline underline-offset-4 hover:text-[var(--accent-ink)]"
        >
          Sign in
        </Link>
      </p>
    </main>
  );
}
