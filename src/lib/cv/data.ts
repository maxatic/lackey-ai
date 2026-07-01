import { getTrack } from '@/lib/db/tracks';
import { listEntries } from '@/lib/db/entries';
import { listBullets } from '@/lib/db/bullets';
import { listSkills } from '@/lib/db/skills';
import { listLanguages } from '@/lib/db/languages';
import { getProfile } from '@/lib/db/profile';
import { getTrackEntryIds, getTrackSkillIds } from '@/lib/db/curation';
import type { CvData, CvLocale } from './types';
import type { EntryKind } from '@/lib/db/entry-kinds';

export type SnapshotBullet = { id: string; text: string };
export type SnapshotEntry = {
  id: string;
  kind: EntryKind;
  title: string;
  organization: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  summary: string | null;
  details: Record<string, string>;
  bullets: SnapshotBullet[];
};
export type TrackSnapshot = {
  track: { name: string; target_title: string | null; summary: string | null };
  profile: CvData['profile'];
  entries: SnapshotEntry[];
  skills: { id: string; name: string; category: string | null }[];
  languages: { name: string; cefr_level: string }[];
};

export async function buildTrackSnapshot(trackId: string): Promise<TrackSnapshot> {
  const track = await getTrack(trackId);
  if (!track) throw new Error('Track not found');

  const [entryIds, skillIds, allEntries, allSkills, languages, profile] = await Promise.all([
    getTrackEntryIds(trackId), getTrackSkillIds(trackId),
    listEntries(), listSkills(), listLanguages(), getProfile(),
  ]);

  const byId = new Map(allEntries.map((e) => [e.id, e]));
  const orderedEntries = entryIds.map((id) => byId.get(id)).filter((e): e is NonNullable<typeof e> => !!e);
  const entries: SnapshotEntry[] = await Promise.all(orderedEntries.map(async (e) => ({
    id: e.id,
    kind: e.kind,
    title: e.title,
    organization: e.organization,
    location: e.location,
    start_date: e.start_date,
    end_date: e.end_date,
    is_current: e.is_current,
    summary: e.summary,
    details: (e.details ?? {}) as Record<string, string>,
    bullets: (await listBullets(e.id)).map((b) => ({ id: b.id, text: b.text })),
  })));

  const skillById = new Map(allSkills.map((s) => [s.id, s]));
  const skills = skillIds
    .map((id) => skillById.get(id))
    .filter(Boolean)
    .map((s) => ({ id: s!.id, name: s!.name, category: s!.category }));

  return {
    track: { name: track.name, target_title: track.target_title, summary: track.summary },
    profile: {
      full_name: profile?.full_name ?? null,
      headline: profile?.headline ?? null,
      email: profile?.email ?? null,
      phone: profile?.phone ?? null,
      location: profile?.location ?? null,
      // links is a Json column — validate element shape so a malformed row can't throw at render time.
      links: Array.isArray(profile?.links)
        ? (profile!.links as unknown[]).filter(
            (l): l is { label: string; url: string } =>
              !!l &&
              typeof (l as { label?: unknown }).label === 'string' &&
              typeof (l as { url?: unknown }).url === 'string',
          )
        : [],
      date_of_birth: profile?.date_of_birth ?? null,
      nationality: profile?.nationality ?? null,
      marital_status: profile?.marital_status ?? null,
    },
    entries,
    skills,
    languages: languages.map((l) => ({ name: l.name, cefr_level: l.cefr_level })),
  };
}

export function toCvData(snapshot: TrackSnapshot, locale: CvLocale): CvData {
  return {
    locale,
    profile: snapshot.profile,
    track: snapshot.track,
    entries: snapshot.entries.map(({ id: _id, bullets, ...rest }) => ({
      ...rest,
      bullets: bullets.map((b) => b.text),
    })),
    skills: snapshot.skills.map(({ name, category }) => ({ name, category })),
    languages: snapshot.languages,
  };
}

export async function getCvData(trackId: string, locale: CvLocale): Promise<CvData> {
  return toCvData(await buildTrackSnapshot(trackId), locale);
}
