// src/app/dashboard/profile/page.tsx
import { getProfile } from '@/lib/db/profile';
import { ProfileForm } from './ProfileForm';

export default async function ProfilePage() {
  const profile = await getProfile();
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Your profile</h1>
      <ProfileForm profile={profile} />
    </div>
  );
}
