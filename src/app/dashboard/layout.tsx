import { ensureUser } from '@/lib/auth/ensure-user';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureUser();
  return <>{children}</>;
}
