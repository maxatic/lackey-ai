import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fixture from './__fixtures__/hiringcafe.json';
import { mapHiringCafe, searchHiringCafe } from './hiringcafe';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
const Q = { keywords: 'react', country: 'nl', remote: true };

describe('hiringcafe adapter', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubEnv('APIFY_TOKEN', 'token');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('mapHiringCafe maps a complete item', () => {
    const r = mapHiringCafe(fixture[0]);
    expect(r).toMatchObject({
      source: 'hiringcafe', source_id: 'hc-1', title: 'Frontend Engineer',
      company: 'ACME', location: 'Amsterdam, Netherlands', remote: true,
      url: 'https://jobs.lever.co/acme/123', posted_at: '2026-06-30T00:00:00Z',
    });
    expect(r!.salary).toContain('60');
  });

  it('mapHiringCafe fills nulls on a minimal item and rejects an unusable one', () => {
    const min = mapHiringCafe(fixture[1]);
    expect(min).toMatchObject({
      source: 'hiringcafe', source_id: 'hc-2', title: 'Data Engineer',
      company: null, location: null, remote: null, salary: null, posted_at: null,
    });
    expect(mapHiringCafe(fixture[2])).toBeNull();
    expect(mapHiringCafe(null)).toBeNull();
  });

  it('searchHiringCafe POSTs the actor input and maps items', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => fixture });
    const results = await searchHiringCafe({ keywords: 'react', country: 'nl', remote: true });
    expect(results).toHaveLength(2);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('memo23~apify-hiring-cafe-scraper/run-sync-get-dataset-items');
    expect(String(url)).toContain('token=');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ keyword: 'react', location: 'Netherlands', workplaceType: 'Remote', maxItems: 25, enrichDescription: false });
  });

  it('throws "Hiring Cafe unavailable" on missing APIFY_TOKEN / non-200', async () => {
    vi.stubEnv('APIFY_TOKEN', '');
    await expect(searchHiringCafe(Q)).rejects.toThrow('Hiring Cafe unavailable');
    expect(fetchMock).not.toHaveBeenCalled();
    vi.stubEnv('APIFY_TOKEN', 'token');
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    await expect(searchHiringCafe(Q)).rejects.toThrow('Hiring Cafe unavailable');
  });

  it('throws "Hiring Cafe unavailable" on fetch failure', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    await expect(searchHiringCafe(Q)).rejects.toThrow('Hiring Cafe unavailable');
  });
});
