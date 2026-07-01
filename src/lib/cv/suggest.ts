import { callStructured } from '@/lib/ai/client';
import type { ParsedJd } from '@/lib/jd/types';
import type { TrackSnapshot } from './data';

export type CvSuggestions = {
  entry_order: string[];
  entry_exclude: string[];
  skill_order: string[];
  skill_exclude: string[];
  bullet_rewrites: { bullet_id: string; suggested_text: string; reason: string }[];
  summary_rewrite: { suggested_text: string; reason: string } | null;
  headline_rewrite: { suggested_text: string; reason: string } | null;
};

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((s) => typeof s === 'string');
const isRewrite = (v: unknown): v is { suggested_text: string; reason: string } =>
  !!v && typeof v === 'object' &&
  typeof (v as Record<string, unknown>).suggested_text === 'string' &&
  typeof (v as Record<string, unknown>).reason === 'string';

export function validateSuggestions(raw: unknown, snapshot: TrackSnapshot): CvSuggestions | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!isStringArray(r.entry_order) || !isStringArray(r.entry_exclude)) return null;
  if (!isStringArray(r.skill_order) || !isStringArray(r.skill_exclude)) return null;
  if (!Array.isArray(r.bullet_rewrites)) return null;
  if (!r.bullet_rewrites.every((b) =>
    !!b && typeof b === 'object' &&
    typeof (b as Record<string, unknown>).bullet_id === 'string' &&
    isRewrite(b),
  )) return null;
  if (r.summary_rewrite !== null && !isRewrite(r.summary_rewrite)) return null;
  if (r.headline_rewrite !== null && !isRewrite(r.headline_rewrite)) return null;

  // Grounding: filter ids the Skeleton doesn't actually contain.
  const entryIds = new Set(snapshot.entries.map((e) => e.id));
  const skillIds = new Set(snapshot.skills.map((s) => s.id));
  const bulletIds = new Set(snapshot.entries.flatMap((e) => e.bullets.map((b) => b.id)));
  return {
    entry_order: r.entry_order.filter((id) => entryIds.has(id)),
    entry_exclude: r.entry_exclude.filter((id) => entryIds.has(id)),
    skill_order: r.skill_order.filter((id) => skillIds.has(id)),
    skill_exclude: r.skill_exclude.filter((id) => skillIds.has(id)),
    bullet_rewrites: (r.bullet_rewrites as CvSuggestions['bullet_rewrites']).filter((b) => bulletIds.has(b.bullet_id)),
    summary_rewrite: r.summary_rewrite as CvSuggestions['summary_rewrite'],
    headline_rewrite: r.headline_rewrite as CvSuggestions['headline_rewrite'],
  };
}

const REWRITE_SCHEMA = {
  type: ['object', 'null'],
  properties: { suggested_text: { type: 'string' }, reason: { type: 'string' } },
  required: ['suggested_text', 'reason'],
  additionalProperties: false,
};

const SUGGESTIONS_SCHEMA = {
  type: 'object',
  properties: {
    entry_order: { type: 'array', items: { type: 'string' }, description: 'All entry ids to include, most JD-relevant first' },
    entry_exclude: { type: 'array', items: { type: 'string' }, description: 'Entry ids to drop for this job' },
    skill_order: { type: 'array', items: { type: 'string' }, description: 'All skill ids to include, most JD-relevant first' },
    skill_exclude: { type: 'array', items: { type: 'string' }, description: 'Skill ids to drop for this job' },
    bullet_rewrites: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          bullet_id: { type: 'string', description: 'Id of the EXISTING bullet this rephrases' },
          suggested_text: { type: 'string', description: 'The rephrased bullet — same facts, JD-aligned wording' },
          reason: { type: 'string', description: 'One sentence: why this rewording matches the JD' },
        },
        required: ['bullet_id', 'suggested_text', 'reason'],
        additionalProperties: false,
      },
    },
    summary_rewrite: { ...REWRITE_SCHEMA, description: 'Reworded track summary, or null' },
    headline_rewrite: { ...REWRITE_SCHEMA, description: 'Reworded headline, or null' },
  },
  required: ['entry_order', 'entry_exclude', 'skill_order', 'skill_exclude', 'bullet_rewrites', 'summary_rewrite', 'headline_rewrite'],
  additionalProperties: false,
} as const;

function serializeSnapshot(s: TrackSnapshot): string {
  // Only what the AI needs — ids + text. No PII beyond headline/summary.
  return JSON.stringify({
    headline: s.profile.headline,
    track_summary: s.track.summary,
    entries: s.entries.map((e) => ({
      id: e.id, kind: e.kind, title: e.title, organization: e.organization,
      summary: e.summary, bullets: e.bullets,
    })),
    skills: s.skills,
  }, null, 2);
}

export async function suggestCvDiff(jd: ParsedJd, snapshot: TrackSnapshot): Promise<CvSuggestions> {
  return callStructured<CvSuggestions>({
    system: [
      'You tailor a CV to a job description by suggesting a diff against the existing CV data.',
      'HARD RULES: never invent facts, experience, skills, or achievements. Bullet rewrites may only rephrase the referenced bullet\'s existing facts to echo the job description\'s language and emphasis.',
      'Reorder entries and skills by relevance to the JD. Exclude items only when clearly irrelevant.',
      'Every suggestion must include a short reason tied to the JD.',
    ].join(' '),
    user: `JOB DESCRIPTION (parsed):\n${JSON.stringify(jd, null, 2)}\n\nCURRENT CV DATA (with ids):\n${serializeSnapshot(snapshot)}`,
    toolName: 'record_cv_suggestions',
    toolDescription: 'Record the suggested tailoring diff for this CV against this job description.',
    inputSchema: SUGGESTIONS_SCHEMA as unknown as Record<string, unknown>,
    validate: (raw) => validateSuggestions(raw, snapshot),
    maxTokens: 8192,
  });
}
