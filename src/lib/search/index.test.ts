/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const adz = vi.fn();
const hc = vi.fn();
vi.mock('./adzuna', () => ({ searchAdzuna: (...a: any[]) => adz(...a) }));
vi.mock('./hiringcafe', () => ({ searchHiringCafe: (...a: any[]) => hc(...a) }));
import { searchJobs } from './index';

const R = (source: string, title: string, company = 'C') => ({ source, source_id: title, title, company, location: null, remote: null, salary: null, url: 'https://x.example/' + title, description: 'd', posted_at: null });

describe('searchJobs merger', () => {
  beforeEach(() => {
    adz.mockReset();
    hc.mockReset();
  });

  it('merges, interleaves hiringcafe-first, dedups by title+company', async () => {
    hc.mockResolvedValue([R('hiringcafe', 'Dev'), R('hiringcafe', 'QA')]);
    adz.mockResolvedValue([R('adzuna', 'Dev'), R('adzuna', 'PM')]); // 'Dev'+'C' duplicates
    const { results, errors } = await searchJobs({ keywords: 'xx', country: 'de', remote: false });
    expect(errors).toEqual([]);
    expect(results.map((r) => `${r.source}:${r.title}`)).toEqual(['hiringcafe:Dev', 'hiringcafe:QA', 'adzuna:PM']);
  });

  it('one source failing degrades', async () => {
    hc.mockRejectedValue(new Error('Hiring Cafe unavailable'));
    adz.mockResolvedValue([R('adzuna', 'PM')]);
    const { results, errors } = await searchJobs({ keywords: 'xx', country: 'de', remote: false });
    expect(results).toHaveLength(1);
    expect(errors).toEqual(['Hiring Cafe unavailable']);
  });

  it('both failing yields empty results + both errors (no throw)', async () => {
    hc.mockRejectedValue(new Error('Hiring Cafe unavailable'));
    adz.mockRejectedValue(new Error('Adzuna unavailable'));
    const { results, errors } = await searchJobs({ keywords: 'xx', country: 'de', remote: false });
    expect(results).toEqual([]);
    expect(errors).toEqual(['Hiring Cafe unavailable', 'Adzuna unavailable']);
  });

  it('rejects blank / too-long keywords before calling adapters', async () => {
    await expect(searchJobs({ keywords: '  ', country: 'de', remote: false })).rejects.toThrow('Enter search keywords');
    await expect(searchJobs({ keywords: 'x'.repeat(201), country: 'de', remote: false })).rejects.toThrow('Enter search keywords');
    expect(adz).not.toHaveBeenCalled();
    expect(hc).not.toHaveBeenCalled();
  });
});
