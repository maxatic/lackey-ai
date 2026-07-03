import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fixture from './__fixtures__/adzuna.json';
import { mapAdzuna, searchAdzuna } from './adzuna';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
const Q = { keywords: 'typescript', country: 'de', remote: false };

describe('adzuna adapter', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubEnv('ADZUNA_APP_ID', 'id');
    vi.stubEnv('ADZUNA_APP_KEY', 'key');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('mapAdzuna maps a complete row', () => {
    const r = mapAdzuna(fixture.results[0]);
    expect(r).toMatchObject({
      source: 'adzuna', source_id: '5001', title: 'Senior TypeScript Engineer',
      company: 'ACME GmbH', location: 'Berlin, Deutschland',
      url: 'https://www.adzuna.de/land/ad/5001', posted_at: '2026-06-28T09:00:00Z',
    });
    expect(r!.salary).toContain('70');
  });

  it('mapAdzuna fills nulls on a minimal row and rejects an unusable one', () => {
    const min = mapAdzuna(fixture.results[1]);
    expect(min).toMatchObject({ company: null, location: null, salary: null, posted_at: null });
    expect(mapAdzuna(fixture.results[2])).toBeNull();
    expect(mapAdzuna(null)).toBeNull();
  });

  it('mapAdzuna rejects non-http(s) redirect_url and accepts http://', () => {
    const base = { id: 6001, title: 'XSS Engineer' };
    expect(mapAdzuna({ ...base, redirect_url: 'javascript:alert(1)' })).toBeNull();
    expect(mapAdzuna({ ...base, redirect_url: 'http://adzuna.de/land/ad/6001' })).toMatchObject({
      url: 'http://adzuna.de/land/ad/6001',
    });
  });

  it('searchAdzuna builds the URL and maps results', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => fixture });
    const results = await searchAdzuna(Q);
    expect(results).toHaveLength(2); // unusable row dropped
    const url: string = fetchMock.mock.calls[0][0];
    expect(url).toContain('/jobs/de/search/1');
    expect(url).toContain('what=typescript');
    expect(url).toContain('results_per_page=25');
  });

  it('searchAdzuna appends remote to keywords when remote=true', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ results: [] }) });
    await searchAdzuna({ ...Q, remote: true });
    expect(String(fetchMock.mock.calls[0][0])).toContain('what=typescript%20remote');
  });

  it('searchAdzuna throws "Adzuna unavailable" on missing env / non-200', async () => {
    vi.stubEnv('ADZUNA_APP_ID', '');
    await expect(searchAdzuna(Q)).rejects.toThrow('Adzuna unavailable');
    expect(fetchMock).not.toHaveBeenCalled();
    vi.stubEnv('ADZUNA_APP_ID', 'id');
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    await expect(searchAdzuna(Q)).rejects.toThrow('Adzuna unavailable');
  });

  it('searchAdzuna throws "Adzuna unavailable" on fetch failure / unparseable body', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    await expect(searchAdzuna(Q)).rejects.toThrow('Adzuna unavailable');
    fetchMock.mockResolvedValue({ ok: true, json: async () => { throw new Error('bad json'); } });
    await expect(searchAdzuna(Q)).resolves.toEqual([]);
  });
});
