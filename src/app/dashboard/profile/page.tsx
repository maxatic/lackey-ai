// src/app/dashboard/profile/page.tsx
import { getProfile } from '@/lib/db/profile';
import { ProfileForm } from './ProfileForm';

export default async function ProfilePage() {
  const profile = await getProfile();
  return (
    <div>
      <p className="kicker">Your skeleton</p>
      <h1 className="app-title mt-2">Profile</h1>
      <p className="app-subtitle">
        The personal details every CV starts from. Locale flags mark fields
        some countries expect and others forbid.
      </p>
      <div className="mt-8">
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}
