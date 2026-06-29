// src/app/dashboard/profile/ProfileForm.tsx
'use client';

import { LocaleHint } from '@/components/LocaleHint';
import { saveProfile, uploadPhoto } from './actions';
import type { Profile, ProfileLink } from '@/lib/db/profile';

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const links: ProfileLink[] = Array.isArray(profile?.links)
    ? (profile!.links as ProfileLink[])
    : [];
  const link0 = links[0] ?? { label: '', url: '' };
  const link1 = links[1] ?? { label: '', url: '' };

  return (
    <div className="max-w-xl space-y-8">
      <form action={uploadPhoto} className="space-y-2">
        <label className="flex items-center font-medium">
          Photo <LocaleHint field="photo" />
        </label>
        {profile?.photo_url && (
          <p className="text-sm text-gray-500">Current: {profile.photo_url}</p>
        )}
        <input type="file" name="photo" accept="image/*" />
        <button type="submit" className="rounded bg-gray-200 px-3 py-1">
          Upload photo
        </button>
      </form>

      <form action={saveProfile} className="space-y-4">
        {(
          [
            ['full_name', 'Full name', 'text'],
            ['headline', 'Headline', 'text'],
            ['email', 'Email', 'email'],
            ['phone', 'Phone', 'tel'],
            ['location', 'Location', 'text'],
          ] as const
        ).map(([name, label, type]) => (
          <label key={name} className="block">
            <span className="font-medium">{label}</span>
            <input
              name={name}
              type={type}
              defaultValue={(profile?.[name] as string | null) ?? ''}
              className="mt-1 block w-full rounded border px-2 py-1"
            />
          </label>
        ))}

        <fieldset className="space-y-2">
          <legend className="font-medium">Links</legend>
          {[link0, link1].map((l, i) => (
            <div key={i} className="flex gap-2">
              <input
                name="link_label"
                placeholder="Label"
                defaultValue={l.label}
                className="w-1/3 rounded border px-2 py-1"
              />
              <input
                name="link_url"
                placeholder="https://…"
                defaultValue={l.url}
                className="flex-1 rounded border px-2 py-1"
              />
            </div>
          ))}
        </fieldset>

        <label className="block">
          <span className="flex items-center font-medium">
            Date of birth <LocaleHint field="date_of_birth" />
          </span>
          <input
            name="date_of_birth"
            type="date"
            defaultValue={profile?.date_of_birth ?? ''}
            className="mt-1 block rounded border px-2 py-1"
          />
        </label>

        {(
          [
            ['nationality', 'Nationality'],
            ['marital_status', 'Marital status'],
            ['gender', 'Gender'],
            ['driving_license', 'Driving license'],
          ] as const
        ).map(([name, label]) => (
          <label key={name} className="block">
            <span className="flex items-center font-medium">
              {label} <LocaleHint field={name} />
            </span>
            <input
              name={name}
              type="text"
              defaultValue={(profile?.[name] as string | null) ?? ''}
              className="mt-1 block w-full rounded border px-2 py-1"
            />
          </label>
        ))}

        <button type="submit" className="rounded bg-black px-4 py-2 text-white">
          Save profile
        </button>
      </form>
    </div>
  );
}
