/* eslint-disable @typescript-eslint/no-explicit-any */
import { it, expect, vi, beforeEach } from 'vitest';

const searchJobsMock = vi.fn();
const createJobFromSearchMock = vi.fn();
vi.mock('@/lib/search', () => ({ searchJobs: (q: any) => searchJobsMock(q) }));
vi.mock('@/lib/db/jobs', () => ({ createJobFromSearch: (r: any) => createJobFromSearchMock(r) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { searchJobsAction, saveSearchResultAction, maxDuration } from './actions';

const GOOD = {
  source: 'adzuna', source_id: '5001', title: 'Dev', company: 'ACME',
  location: 'Berlin', remote: null, salary: null,
  url: 'https://example.com/5001', description: 'JD text here', posted_at: null,
};

beforeEach(() => {
  searchJobsMock.mockReset();
  createJobFromSearchMock.mockReset();
});

it('exports maxDuration for the Apify sync call', () => {
  expect(maxDuration).toBe(60);
});

it('searchJobsAction passes the query through and returns results+errors', async () => {
  searchJobsMock.mockResolvedValue({ results: [GOOD], errors: ['Adzuna unavailable'] });
  const fd = new FormData();
  fd.set('keywords', 'react developer');
  fd.set('country', 'nl');
  fd.set('remote', 'on');
  await expect(searchJobsAction(fd)).resolves.toEqual({ results: [GOOD], errors: ['Adzuna unavailable'] });
  expect(searchJobsMock).toHaveBeenCalledWith({ keywords: 'react developer', country: 'nl', remote: true });
});

it('searchJobsAction falls back to de for an unknown country and remote off', async () => {
  searchJobsMock.mockResolvedValue({ results: [], errors: [] });
  const fd = new FormData();
  fd.set('keywords', 'react');
  fd.set('country', 'zz');
  await searchJobsAction(fd);
  expect(searchJobsMock).toHaveBeenCalledWith({ keywords: 'react', country: 'de', remote: false });
});

it('searchJobsAction maps thrown validation to { error: "Enter search keywords" }', async () => {
  searchJobsMock.mockRejectedValue(new Error('Enter search keywords'));
  const fd = new FormData();
  fd.set('keywords', '');
  await expect(searchJobsAction(fd)).resolves.toEqual({ error: 'Enter search keywords' });
});

it('saveSearchResultAction rejects hostile payloads', async () => {
  for (const bad of ['not json', '{}', JSON.stringify({ ...GOOD, url: 'javascript:alert(1)' }), JSON.stringify({ ...GOOD, source: 'evil' })]) {
    await expect(saveSearchResultAction(bad)).resolves.toEqual({ error: 'Invalid search result' });
  }
  expect(createJobFromSearchMock).not.toHaveBeenCalled();
});

it('saveSearchResultAction saves and returns the job id', async () => {
  createJobFromSearchMock.mockResolvedValue({ id: 'j9' });
  await expect(saveSearchResultAction(JSON.stringify(GOOD))).resolves.toEqual({ jobId: 'j9' });
  expect(createJobFromSearchMock).toHaveBeenCalledWith(expect.objectContaining({ source: 'adzuna', source_id: '5001' }));
});
