/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = {
  getJob: vi.fn(), buildTrackSnapshot: vi.fn(), suggestPoints: vi.fn(),
  writeLetter: vi.fn(), upsertCoverLetter: vi.fn(),
};
vi.mock('@/lib/db/jobs', () => ({ getJob: (...a: any[]) => mocks.getJob(...a) }));
vi.mock('@/lib/cv/data', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  buildTrackSnapshot: (...a: any[]) => mocks.buildTrackSnapshot(...a),
}));
vi.mock('@/lib/letter/points', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  suggestPoints: (...a: any[]) => mocks.suggestPoints(...a),
}));
vi.mock('@/lib/letter/write', () => ({ writeLetter: (...a: any[]) => mocks.writeLetter(...a) }));
vi.mock('@/lib/db/cover-letters', () => ({ upsertCoverLetter: (...a: any[]) => mocks.upsertCoverLetter(...a) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { suggestLetterPointsAction, generateLetterAction, saveCoverLetterAction } from './actions';
import { GENERIC_ACTION_ERROR } from '@/lib/action-error';

const SNAP = {
  track: { name: 'T', target_title: null, summary: null },
  profile: { full_name: 'A B', headline: 'Dev', email: null, phone: null, location: null, links: [], date_of_birth: null, nationality: null, marital_status: null },
  entries: [{ id: 'e1', kind: 'experience', title: 'Dev', organization: null, location: null, start_date: null, end_date: null, is_current: false, summary: null, details: {}, bullets: [] }],
  skills: [], languages: [],
};
const PARSED = { title: 'SWE', company: null, location: null, language: null, requirements: [], keywords: [] };
const POINT = { entry_id: 'e1', text: 'Built x', reason: 'relevant' };

beforeEach(() => { Object.values(mocks).forEach((m) => m.mockReset()); });

describe('letter actions', () => {
  it('suggestLetterPointsAction returns points', async () => {
    mocks.getJob.mockResolvedValue({ id: 'j1', parsed: PARSED });
    mocks.buildTrackSnapshot.mockResolvedValue(SNAP);
    mocks.suggestPoints.mockResolvedValue([POINT]);
    await expect(suggestLetterPointsAction('j1', 't1')).resolves.toEqual({ points: [POINT] });
  });

  it('suggestLetterPointsAction: missing job → allowlisted error', async () => {
    mocks.getJob.mockResolvedValue(null);
    await expect(suggestLetterPointsAction('jX', 't1')).resolves.toEqual({ error: 'Job not found' });
  });

  it('suggestLetterPointsAction: unexpected error collapses to generic', async () => {
    mocks.getJob.mockResolvedValue({ id: 'j1', parsed: PARSED });
    mocks.buildTrackSnapshot.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:5432'));
    await expect(suggestLetterPointsAction('j1', 't1')).resolves.toEqual({ error: GENERIC_ACTION_ERROR });
  });

  it('generateLetterAction sanitizes client points and calls writeLetter with profile basics', async () => {
    mocks.getJob.mockResolvedValue({ id: 'j1', parsed: PARSED });
    mocks.buildTrackSnapshot.mockResolvedValue(SNAP);
    mocks.writeLetter.mockResolvedValue('Dear team, ...');
    const hostile = JSON.stringify([POINT, { entry_id: 'ghost', text: 't', reason: 'r' }, { bad: 1 }]);
    await expect(generateLetterAction('j1', 't1', hostile)).resolves.toEqual({ body: 'Dear team, ...' });
    expect(mocks.writeLetter).toHaveBeenCalledWith(PARSED, [POINT], { full_name: 'A B', headline: 'Dev' });
  });

  it('generateLetterAction: no surviving points → allowlisted error, no AI call', async () => {
    mocks.getJob.mockResolvedValue({ id: 'j1', parsed: PARSED });
    mocks.buildTrackSnapshot.mockResolvedValue(SNAP);
    await expect(generateLetterAction('j1', 't1', 'not json')).resolves.toEqual({ error: 'No talking points selected — accept at least one point' });
    expect(mocks.writeLetter).not.toHaveBeenCalled();
  });

  it('saveCoverLetterAction upserts sanitized points + body', async () => {
    mocks.buildTrackSnapshot.mockResolvedValue(SNAP);
    mocks.upsertCoverLetter.mockResolvedValue({});
    await expect(saveCoverLetterAction('j1', 't1', JSON.stringify([POINT]), 'my letter')).resolves.toEqual({ ok: true });
    expect(mocks.upsertCoverLetter).toHaveBeenCalledWith({ job_id: 'j1', track_id: 't1', points: [POINT], body: 'my letter' });
  });
});
