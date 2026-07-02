/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const parseJdMock = vi.fn();
const createJobMock = vi.fn();
const updateJobMock = vi.fn();
const updateJobStatusMock = vi.fn();
const redirectMock = vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); });
vi.mock('@/lib/jd/parse', () => ({ parseJd: (t: string) => parseJdMock(t), JD_MAX_CHARS: 20_000 }));
vi.mock('@/lib/db/jobs', () => ({
  createJob: (i: any) => createJobMock(i),
  updateJob: (...a: any[]) => updateJobMock(...a),
  updateJobStatus: (...a: any[]) => updateJobStatusMock(...a),
}));
vi.mock('next/navigation', () => ({ redirect: (u: string) => redirectMock(u) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { createJobAction, updateJobStatusAction, updateJobNotesAction } from './actions';

beforeEach(() => { parseJdMock.mockReset(); createJobMock.mockReset(); updateJobMock.mockReset(); updateJobStatusMock.mockReset(); redirectMock.mockClear(); });

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

it('updateJobStatusAction rejects an unknown status without touching the db', async () => {
  await expect(updateJobStatusAction('j1', 'ghosted')).resolves.toEqual({ error: 'Invalid status' });
  expect(updateJobStatusMock).not.toHaveBeenCalled();
});

it('updateJobStatusAction updates on a valid status', async () => {
  updateJobStatusMock.mockResolvedValue({});
  await expect(updateJobStatusAction('j1', 'applied')).resolves.toEqual({});
  expect(updateJobStatusMock).toHaveBeenCalledWith('j1', 'applied');
});

it('updateJobNotesAction caps notes length', async () => {
  await expect(updateJobNotesAction('j1', 'x'.repeat(5001))).resolves.toEqual({ error: 'Notes are too long (max 5,000 characters)' });
  expect(updateJobMock).not.toHaveBeenCalled();
});

it('updateJobNotesAction saves notes', async () => {
  updateJobMock.mockResolvedValue({});
  await expect(updateJobNotesAction('j1', 'call back Tue')).resolves.toEqual({});
  expect(updateJobMock).toHaveBeenCalledWith('j1', { notes: 'call back Tue' });
});
