import { describe, it, expect } from 'vitest';
import { renderCv } from '@/lib/cv/render';
import type { CvData } from '@/lib/cv/types';

const base: Omit<CvData, 'locale'> = {
  profile: {
    full_name: 'Ada Lovelace', headline: 'Analytical Engineer',
    email: 'ada@example.com', phone: '+44 20 7946 0000', location: 'London, UK',
    links: [{ label: 'GitHub', url: 'https://github.com/ada' }],
    date_of_birth: '1815-12-10', nationality: 'British', marital_status: 'single',
  },
  track: { name: 'Backend Roles', target_title: 'Senior Engineer', summary: 'R&D leader.' },
  entries: [{
    kind: 'experience', title: 'Engineer', organization: 'Babbage & Co',
    location: 'London', start_date: '2023-01-01', end_date: null, is_current: true,
    summary: null, details: {}, bullets: ['Built the engine', 'Saved 100% time'],
  }],
  skills: [{ name: 'Mathematics', category: 'Core' }],
  languages: [{ name: 'English', cefr_level: 'native' }],
};

describe('renderCv', () => {
  it('UK omits DOB and nationality', () => {
    const tex = renderCv({ ...base, locale: 'uk' });
    expect(tex).toContain('\\documentclass');
    expect(tex).toContain('Ada Lovelace');
    expect(tex).not.toContain('1815'); // no DOB
    expect(tex).not.toContain('British'); // no nationality
    expect(tex).toContain('\\section*{Experience}');
  });
  it('DE includes a personal-data block with DOB and nationality', () => {
    const tex = renderCv({ ...base, locale: 'de' });
    expect(tex).toContain('10/12/1815'); // DOB formatted dd/mm/yyyy
    expect(tex).toContain('British');
  });
  it('escapes user text (no raw & reaches the document body)', () => {
    const tex = renderCv({ ...base, locale: 'uk' });
    expect(tex).toContain('Babbage \\& Co');
    expect(tex).not.toMatch(/[^\\]&/); // every & is escaped
  });
  it('current role shows "Present"', () => {
    const tex = renderCv({ ...base, locale: 'uk' });
    expect(tex).toContain('Present');
  });
});
