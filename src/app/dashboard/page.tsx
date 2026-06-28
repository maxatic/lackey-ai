import { auth } from '@clerk/nextjs/server';
import { getPostHogServer } from '@/lib/posthog/server';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (userId) {
    const ph = getPostHogServer();
    ph.capture({ distinctId: userId, event: 'dashboard_viewed' });
    await ph.flush();
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-gray-600">You are signed in. Skeleton coming soon.</p>
    </main>
  );
}
