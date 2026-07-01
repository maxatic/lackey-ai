import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-lg">This page could not be found.</p>
      <Link href="/" className="underline">
        Back home
      </Link>
    </main>
  );
}
