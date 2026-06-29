import { getTrack } from '@/lib/db/tracks';
import { listEntries } from '@/lib/db/entries';
import { listBullets } from '@/lib/db/bullets';
import { listSkills } from '@/lib/db/skills';
import { listLanguages } from '@/lib/db/languages';
import { getProfile } from '@/lib/db/profile';
import { getTrackEntryIds, getTrackSkillIds } from '@/lib/db/curation';
import type { CvData, CvLocale, CvEntry } from './types';

export async function getCvData(trackId: string, locale: CvLocale): Promise<CvData> {
  const track = await getTrack(trackId);
  if (!track) throw new Error('Track not found');

  const [entryIds, skillIds, allEntries, allSkills, languages, profile] = await Promise.all([
    getTrackEntryIds(trackId), getTrackSkillIds(trackId),
    listEntries(), listSkills(), listLanguages(), getProfile(),
  ]);

  const byId = new Map(allEntries.map((e) => [e.id, e]));
  const orderedEntries = entryIds.map((id) => byId.get(id)).filter((e): e is NonNullable<typeof e> => !!e);
  const entries: CvEntry[] = await Promise.all(orderedEntries.map(async (e) => ({
    kind: e.kind,
    title: e.title,
    organization: e.organization,
    location: e.location,
    start_date: e.start_date,
    end_date: e.end_date,
    is_current: e.is_current,
    summary: e.summary,
    details: (e.details ?? {}) as Record<string, string>,
    bullets: (await listBullets(e.id)).map((b) => b.text),
  })));

  const skillById = new Map(allSkills.map((s) => [s.id, s]));
  const skills = skillIds
    .map((id) => skillById.get(id))
    .filter(Boolean)
    .map((s) => ({ name: s!.name, category: s!.category }));

  return {
    locale,
    profile: {
      full_name: profile?.full_name ?? null,
      headline: profile?.headline ?? null,
      email: profile?.email ?? null,
      phone: profile?.phone ?? null,
      location: profile?.location ?? null,
      links: Array.isArray(profile?.links) ? (profile!.links as { label: string; url: string }[]) : [],
      date_of_birth: profile?.date_of_birth ?? null,
      nationality: profile?.nationality ?? null,
      marital_status: profile?.marital_status ?? null,
    },
    track: { name: track.name, target_title: track.target_title, summary: track.summary },
    entries,
    skills,
    languages: languages.map((l) => ({ name: l.name, cefr_level: l.cefr_level })),
  };
}
