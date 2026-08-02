/* eslint-disable @typescript-eslint/no-explicit-any */
import { it, expect, vi, beforeEach } from 'vitest';

const searchJobsMock = vi.fn();
const createJobFromSearchMock = vi.fn();
vi.mock('@/lib/search', () => ({ searchJobs: (q: any) => searchJobsMock(q) }));
vi.mock('@/lib/db/jobs', () => ({
  createJobFromSearch: (r: any) => createJobFromSearchMock(r),
  listSavedSourceIds: vi.fn(async () => []),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { searchJobsAction, saveSearchResultAction } from './actions';
// maxDuration lives on the route segment (page), not the 'use server' file —
// Next.js forbids non-async exports there. Actions inherit the route's config.
import { maxDuration } from './page';

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

it('searchJobsAction searches Germany only and returns results+errors', async () => {
  searchJobsMock.mockResolvedValue({ results: [GOOD], errors: ['Adzuna unavailable'] });
  const fd = new FormData();
  fd.set('keywords', 'react developer');
  fd.set('remote', 'on');
  await expect(searchJobsAction(fd)).resolves.toEqual({ results: [GOOD], errors: ['Adzuna unavailable'] });
  expect(searchJobsMock).toHaveBeenCalledWith({ keywords: 'react developer', country: 'de', remote: true });
});

it('searchJobsAction ignores any country field and always uses de', async () => {
  searchJobsMock.mockResolvedValue({ results: [], errors: [] });
  const fd = new FormData();
  fd.set('keywords', 'react');
  fd.set('country', 'nl');
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
