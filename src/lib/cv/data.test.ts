import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/tracks', () => ({
  getTrack: vi.fn(),
}));
vi.mock('@/lib/db/entries', () => ({
  listEntries: vi.fn(),
}));
vi.mock('@/lib/db/bullets', () => ({
  listBullets: vi.fn(),
}));
vi.mock('@/lib/db/skills', () => ({
  listSkills: vi.fn(),
}));
vi.mock('@/lib/db/languages', () => ({
  listLanguages: vi.fn(),
}));
vi.mock('@/lib/db/profile', () => ({
  getProfile: vi.fn(),
}));
vi.mock('@/lib/db/curation', () => ({
  getTrackEntryIds: vi.fn(),
  getTrackSkillIds: vi.fn(),
}));

import { getCvData } from './data';
import { getTrack } from '@/lib/db/tracks';
import { listEntries } from '@/lib/db/entries';
import { listBullets } from '@/lib/db/bullets';
import { listSkills } from '@/lib/db/skills';
import { listLanguages } from '@/lib/db/languages';
import { getProfile } from '@/lib/db/profile';
import { getTrackEntryIds, getTrackSkillIds } from '@/lib/db/curation';

const mockTrack = {
  id: 't1',
  user_id: 'u1',
  name: 'Software Engineer',
  target_title: 'Senior SWE',
  summary: 'Track summary',
  default_locale: 'uk',
  default_template: null,
  sort_order: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockEntries = [
  {
    id: 'e1', user_id: 'u1', kind: 'experience' as const, title: 'Engineer',
    organization: 'Acme', location: 'London', start_date: '2022-01-01',
    end_date: null, is_current: true, summary: 'Built things',
    details: {}, sort_order: 0, created_at: '2024-01-01', updated_at: '2024-01-01',
  },
  {
    id: 'e2', user_id: 'u1', kind: 'education' as const, title: 'BSc CS',
    organization: 'Uni', location: null, start_date: '2018-09-01',
    end_date: '2022-06-01', is_current: false, summary: null,
    details: {}, sort_order: 1, created_at: '2024-01-01', updated_at: '2024-01-01',
  },
  {
    id: 'e3', user_id: 'u1', kind: 'project' as const, title: 'Side Project',
    organization: null, location: null, start_date: null,
    end_date: null, is_current: false, summary: null,
    details: {}, sort_order: 2, created_at: '2024-01-01', updated_at: '2024-01-01',
  },
];

const mockSkills = [
  { id: 's1', user_id: 'u1', name: 'TypeScript', category: 'Languages', proficiency: null, sort_order: 0 },
  { id: 's2', user_id: 'u1', name: 'React', category: 'Frameworks', proficiency: null, sort_order: 1 },
  { id: 's3', user_id: 'u1', name: 'Python', category: 'Languages', proficiency: null, sort_order: 2 },
];

const mockLanguages = [
  { id: 'l1', user_id: 'u1', name: 'English', cefr_level: 'C2' },
  { id: 'l2', user_id: 'u1', name: 'German', cefr_level: 'B1' },
];

const mockProfile = {
  user_id: 'u1', full_name: 'Jane Doe', headline: 'Engineer',
  email: 'jane@example.com', phone: '+44 123', location: 'London',
  links: [{ label: 'GitHub', url: 'https://github.com/jane' }],
  photo_url: null, date_of_birth: '1990-01-01', nationality: 'British',
  marital_status: null, gender: null, driving_license: null,
  updated_at: '2024-01-01',
};

describe('getCvData', () => {
  beforeEach(() => {
    vi.mocked(getTrack).mockResolvedValue(mockTrack);
    vi.mocked(listEntries).mockResolvedValue(mockEntries);
    vi.mocked(listSkills).mockResolvedValue(mockSkills);
    vi.mocked(listLanguages).mockResolvedValue(mockLanguages);
    vi.mocked(getProfile).mockResolvedValue(mockProfile);
    // Track selects e2, e1 (reversed order) — e3 excluded
    vi.mocked(getTrackEntryIds).mockResolvedValue(['e2', 'e1']);
    // Track selects s3, s1 — s2 excluded
    vi.mocked(getTrackSkillIds).mockResolvedValue(['s3', 's1']);
    // bullets per entry
    vi.mocked(listBullets).mockImplementation(async (entryId) => {
      if (entryId === 'e1') return [
        { id: 'b1', user_id: 'u1', entry_id: 'e1', text: 'Led team', tags: [], sort_order: 0, created_at: '2024-01-01' },
      ];
      if (entryId === 'e2') return [
        { id: 'b2', user_id: 'u1', entry_id: 'e2', text: 'Graduated with honours', tags: [], sort_order: 0, created_at: '2024-01-01' },
      ];
      return [];
    });
  });

  it('sets locale', async () => {
    const data = await getCvData('t1', 'uk');
    expect(data.locale).toBe('uk');
  });

  it('filters entries to track entry ids and preserves their order', async () => {
    const data = await getCvData('t1', 'uk');
    expect(data.entries.map((e) => e.title)).toEqual(['BSc CS', 'Engineer']);
  });

  it('excludes entries not in the track', async () => {
    const data = await getCvData('t1', 'uk');
    const titles = data.entries.map((e) => e.title);
    expect(titles).not.toContain('Side Project');
  });

  it('attaches bullets to each entry', async () => {
    const data = await getCvData('t1', 'uk');
    const edu = data.entries.find((e) => e.title === 'BSc CS')!;
    const work = data.entries.find((e) => e.title === 'Engineer')!;
    expect(edu.bullets).toEqual(['Graduated with honours']);
    expect(work.bullets).toEqual(['Led team']);
  });

  it('filters skills to track skill ids and preserves order', async () => {
    const data = await getCvData('t1', 'uk');
    expect(data.skills.map((s) => s.name)).toEqual(['Python', 'TypeScript']);
  });

  it('excludes skills not in the track', async () => {
    const data = await getCvData('t1', 'uk');
    expect(data.skills.map((s) => s.name)).not.toContain('React');
  });

  it('includes all languages', async () => {
    const data = await getCvData('t1', 'uk');
    expect(data.languages).toEqual([
      { name: 'English', cefr_level: 'C2' },
      { name: 'German', cefr_level: 'B1' },
    ]);
  });

  it('throws when track not found', async () => {
    vi.mocked(getTrack).mockResolvedValue(null);
    await expect(getCvData('missing', 'uk')).rejects.toThrow('Track not found');
  });

  it('maps profile fields', async () => {
    const data = await getCvData('t1', 'uk');
    expect(data.profile.full_name).toBe('Jane Doe');
    expect(data.profile.email).toBe('jane@example.com');
    expect(data.profile.links).toEqual([{ label: 'GitHub', url: 'https://github.com/jane' }]);
  });

  it('maps track fields', async () => {
    const data = await getCvData('t1', 'uk');
    expect(data.track).toEqual({ name: 'Software Engineer', target_title: 'Senior SWE', summary: 'Track summary' });
  });
});
