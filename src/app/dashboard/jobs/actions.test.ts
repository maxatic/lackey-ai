/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const parseJdMock = vi.fn();
const createJobMock = vi.fn();
const redirectMock = vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); });
vi.mock('@/lib/jd/parse', () => ({ parseJd: (t: string) => parseJdMock(t), JD_MAX_CHARS: 20_000 }));
vi.mock('@/lib/db/jobs', () => ({ createJob: (i: any) => createJobMock(i) }));
vi.mock('next/navigation', () => ({ redirect: (u: string) => redirectMock(u) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { createJobAction } from './actions';

beforeEach(() => { parseJdMock.mockReset(); createJobMock.mockReset(); redirectMock.mockClear(); });

it('parses, persists and redirects to the job page', async () => {
  parseJdMock.mockResolvedValue({ title: 'SWE', company: 'ACME', location: null, language: null, requirements: [], keywords: [] });
  createJobMock.mockResolvedValue({ id: 'job-1' });
  const fd = new FormData();
  fd.set('raw_text', 'We are hiring…');
  await expect(createJobAction(fd)).rejects.toThrow('REDIRECT:/dashboard/jobs/job-1');
  expect(createJobMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'SWE', company: 'ACME', raw_text: 'We are hiring…' }));
});

it('returns the error instead of throwing when parsing fails', async () => {
  parseJdMock.mockRejectedValue(new Error('Job description is empty'));
  const fd = new FormData();
  fd.set('raw_text', '');
  await expect(createJobAction(fd)).resolves.toEqual({ error: 'Job description is empty' });
  expect(createJobMock).not.toHaveBeenCalled();
});
