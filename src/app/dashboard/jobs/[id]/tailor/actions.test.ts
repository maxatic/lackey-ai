/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = {
  getJob: vi.fn(), buildTrackSnapshot: vi.fn(), suggestCvDiff: vi.fn(),
  upsertNodeCv: vi.fn(), upsertCvDocument: vi.fn(), compilePdf: vi.fn(),
  renderCv: vi.fn(), upload: vi.fn(), createSignedUrl: vi.fn(),
  advanceJobToPrepared: vi.fn(),
};
vi.mock('@/lib/db/jobs', () => ({
  getJob: (...a: any[]) => mocks.getJob(...a),
  advanceJobToPrepared: (...a: any[]) => mocks.advanceJobToPrepared(...a),
}));
vi.mock('@/lib/cv/data', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  buildTrackSnapshot: (...a: any[]) => mocks.buildTrackSnapshot(...a),
}));
vi.mock('@/lib/cv/suggest', () => ({ suggestCvDiff: (...a: any[]) => mocks.suggestCvDiff(...a) }));
vi.mock('@/lib/db/node-cvs', () => ({ upsertNodeCv: (...a: any[]) => mocks.upsertNodeCv(...a) }));
vi.mock('@/lib/db/cv-documents', () => ({ upsertCvDocument: (...a: any[]) => mocks.upsertCvDocument(...a) }));
vi.mock('@/lib/cv/compile', () => ({ compilePdf: (...a: any[]) => mocks.compilePdf(...a) }));
vi.mock('@/lib/cv/render', () => ({ renderCv: (...a: any[]) => mocks.renderCv(...a) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/local-user', () => ({ getUserId: () => 'user_1', LOCAL_USER_NAME: 'Maxat Issaliyev' }));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({
    storage: { from: () => ({ upload: mocks.upload, createSignedUrl: mocks.createSignedUrl }) },
  }),
}));

import { suggestTailoringAction, generateNodeCvAction } from './actions';

const SNAP = { track: { name: 'T', target_title: null, summary: null }, profile: { full_name: null, headline: null, email: null, phone: null, location: null, links: [], date_of_birth: null, nationality: null, marital_status: null }, entries: [], skills: [], languages: [] };

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
});

describe('tailor actions', () => {
  it('suggestTailoringAction returns suggestions + snapshot', async () => {
    mocks.getJob.mockResolvedValue({ id: 'j1', parsed: { title: 'SWE', company: null, location: null, language: null, requirements: [], keywords: [] } });
    mocks.buildTrackSnapshot.mockResolvedValue(SNAP);
    mocks.suggestCvDiff.mockResolvedValue({ entry_order: [], entry_exclude: [], skill_order: [], skill_exclude: [], bullet_rewrites: [], summary_rewrite: null, headline_rewrite: null });
    const res = await suggestTailoringAction('j1', 't1');
    expect('suggestions' in res && res.snapshot).toBeTruthy();
  });

  it('suggestTailoringAction surfaces AI errors as { error }', async () => {
    // valid parsed JD so the action reaches suggestCvDiff (the brief's `parsed: {}` never gets past validateParsedJd)
    mocks.getJob.mockResolvedValue({ id: 'j1', parsed: { title: 'SWE', company: null, location: null, language: null, requirements: [], keywords: [] } });
    mocks.buildTrackSnapshot.mockResolvedValue(SNAP);
    mocks.suggestCvDiff.mockRejectedValue(new Error('Missing ANTHROPIC_API_KEY'));
    await expect(suggestTailoringAction('j1', 't1')).resolves.toEqual({ error: 'Missing ANTHROPIC_API_KEY' });
  });

  it('generateNodeCvAction persists overrides then renders through the pipeline with job-scoped path', async () => {
    mocks.buildTrackSnapshot.mockResolvedValue(SNAP);
    mocks.renderCv.mockReturnValue('\\tex');
    mocks.compilePdf.mockResolvedValue(Buffer.from('%PDF'));
    mocks.upload.mockResolvedValue({ error: null });
    mocks.upsertCvDocument.mockResolvedValue({});
    mocks.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null });
    const fd = new FormData();
    fd.set('job_id', 'j1'); fd.set('track_id', 't1'); fd.set('locale', 'de');
    fd.set('overrides', JSON.stringify({ entry_exclude: ['e9'] }));
    const { url } = await generateNodeCvAction(fd);
    expect(url).toBe('https://signed');
    expect(mocks.upsertNodeCv).toHaveBeenCalledWith(expect.objectContaining({ job_id: 'j1', track_id: 't1' }));
    expect(mocks.upload).toHaveBeenCalledWith('user_1/t1-de-j1.pdf', expect.anything(), expect.anything());
    expect(mocks.upsertCvDocument).toHaveBeenCalledWith(expect.objectContaining({ job_id: 'j1' }));
  });

  const happyPathFd = () => {
    mocks.buildTrackSnapshot.mockResolvedValue(SNAP);
    mocks.renderCv.mockReturnValue('\\tex');
    mocks.compilePdf.mockResolvedValue(Buffer.from('%PDF'));
    mocks.upload.mockResolvedValue({ error: null });
    mocks.upsertCvDocument.mockResolvedValue({});
    mocks.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null });
    const fd = new FormData();
    fd.set('job_id', 'j1'); fd.set('track_id', 't1'); fd.set('locale', 'de'); fd.set('overrides', '{}');
    return fd;
  };

  it('generateNodeCvAction advances the job to prepared on success', async () => {
    const fd = happyPathFd();
    mocks.advanceJobToPrepared.mockResolvedValue(undefined);
    await generateNodeCvAction(fd);
    expect(mocks.advanceJobToPrepared).toHaveBeenCalledWith('j1');
  });

  it('generateNodeCvAction still succeeds when the status bump fails', async () => {
    const fd = happyPathFd();
    mocks.advanceJobToPrepared.mockRejectedValue(new Error('db down'));
    const { url } = await generateNodeCvAction(fd);
    expect(url).toBe('https://signed');
  });

  it('generateNodeCvAction rejects an invalid locale', async () => {
    const fd = new FormData();
    fd.set('job_id', 'j1'); fd.set('track_id', 't1'); fd.set('locale', 'xx'); fd.set('overrides', '{}');
    await expect(generateNodeCvAction(fd)).rejects.toThrow('Invalid locale');
  });
});
