import { auth } from '@clerk/nextjs/server';
import * as Sentry from '@sentry/nextjs';
import { getPostHogServer } from '@/lib/posthog/server';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (userId) {
    // ponytail: telemetry must never crash the page — report and move on.
    try {
      const ph = getPostHogServer();
      ph.capture({ distinctId: userId, event: 'dashboard_viewed' });
      await ph.flush();
    } catch (err) {
      Sentry.captureException(err);
    }
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-gray-600">You are signed in. Skeleton coming soon.</p>
    </main>
  );
}
