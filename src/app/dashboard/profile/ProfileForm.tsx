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
    <div className="max-w-xl space-y-6">
      <form action={uploadPhoto} className="app-card space-y-3 p-5">
        <span className="field-label !mb-0 flex items-center">
          Photo <LocaleHint field="photo" />
        </span>
        {profile?.photo_url && (
          <p className="break-all text-sm text-[var(--ink-soft)]">
            Current: {profile.photo_url}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            name="photo"
            accept="image/*"
            className="max-w-full text-sm text-[var(--ink-soft)]"
          />
          <button type="submit" className="btn btn-quiet">
            Upload photo
          </button>
        </div>
      </form>

      <form action={saveProfile} className="app-card space-y-5 p-5">
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
            <span className="field-label">{label}</span>
            <input
              name={name}
              type={type}
              defaultValue={(profile?.[name] as string | null) ?? ''}
              className="field"
            />
          </label>
        ))}

        <fieldset className="space-y-2">
          <legend className="field-label">Links</legend>
          {[link0, link1].map((l, i) => (
            <div key={i} className="flex gap-2">
              <input
                name="link_label"
                placeholder="Label"
                defaultValue={l.label}
                className="field !w-1/3"
              />
              <input
                name="link_url"
                placeholder="https://…"
                defaultValue={l.url}
                className="field flex-1"
              />
            </div>
          ))}
        </fieldset>

        <label className="block">
          <span className="field-label flex items-center">
            Date of birth <LocaleHint field="date_of_birth" />
          </span>
          <input
            name="date_of_birth"
            type="date"
            defaultValue={profile?.date_of_birth ?? ''}
            className="field !w-auto"
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
            <span className="field-label flex items-center">
              {label} <LocaleHint field={name} />
            </span>
            <input
              name={name}
              type="text"
              defaultValue={(profile?.[name] as string | null) ?? ''}
              className="field"
            />
          </label>
        ))}

        <button type="submit" className="btn btn-primary">
          Save profile
        </button>
      </form>
    </div>
  );
}
