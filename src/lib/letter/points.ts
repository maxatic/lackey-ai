import { callStructured } from '@/lib/ai/client';
import type { ParsedJd } from '@/lib/jd/types';
import type { TrackSnapshot } from '@/lib/cv/data';
import type { LetterPoint } from './types';

const isPoint = (v: unknown): v is LetterPoint =>
  !!v && typeof v === 'object' &&
  typeof (v as Record<string, unknown>).entry_id === 'string' &&
  typeof (v as Record<string, unknown>).text === 'string' &&
  typeof (v as Record<string, unknown>).reason === 'string';

// STRICT — for the AI retry path: shape failure → null; unknown entry ids dropped.
export function validateLetterPoints(raw: unknown, snapshot: TrackSnapshot): LetterPoint[] | null {
  if (!raw || typeof raw !== 'object') return null;
  const points = (raw as Record<string, unknown>).points;
  if (!Array.isArray(points) || !points.every(isPoint)) return null;
  const entryIds = new Set(snapshot.entries.map((e) => e.id));
  return points.filter((p) => entryIds.has(p.entry_id));
}

// LENIENT — for client-supplied JSON: never throws, filters junk item-by-item.
export function sanitizeLetterPoints(raw: unknown, snapshot: TrackSnapshot): LetterPoint[] {
  if (!Array.isArray(raw)) return [];
  const entryIds = new Set(snapshot.entries.map((e) => e.id));
  return raw
    .filter(isPoint)
    .filter((p) => entryIds.has(p.entry_id))
    .map((p) => ({ entry_id: p.entry_id, text: p.text, reason: p.reason }));
}

const POINTS_SCHEMA = {
  type: 'object',
  properties: {
    points: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          entry_id: { type: 'string', description: 'Id of the Skeleton entry that supports this point' },
          text: { type: 'string', description: 'The talking point — one sentence, grounded in the referenced entry' },
          reason: { type: 'string', description: 'One sentence: why this matters for THIS job description' },
        },
        required: ['entry_id', 'text', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['points'],
  additionalProperties: false,
} as const;

function serializeSnapshot(s: TrackSnapshot): string {
  return JSON.stringify({
    headline: s.profile.headline,
    track_summary: s.track.summary,
    entries: s.entries.map((e) => ({
      id: e.id, kind: e.kind, title: e.title, organization: e.organization,
      summary: e.summary, bullets: e.bullets.map((b) => b.text),
    })),
    skills: s.skills.map((sk) => sk.name),
  }, null, 2);
}

export async function suggestPoints(jd: ParsedJd, snapshot: TrackSnapshot): Promise<LetterPoint[]> {
  return callStructured<LetterPoint[]>({
    system: [
      'You select cover-letter talking points by matching a candidate\'s CV data to a job description.',
      'HARD RULES: never invent experience, skills, or achievements. Every point must be directly supported by the referenced entry (its title, organization, summary, or bullets).',
      'Propose 6 to 8 points, most compelling first. Each point is one concrete sentence in the first person, written in German.',
    ].join(' '),
    user: `JOB DESCRIPTION (parsed):\n${JSON.stringify(jd, null, 2)}\n\nCANDIDATE CV DATA (with entry ids):\n${serializeSnapshot(snapshot)}`,
    toolName: 'record_letter_points',
    toolDescription: 'Record the grounded talking points for this cover letter.',
    inputSchema: POINTS_SCHEMA as unknown as Record<string, unknown>,
    validate: (raw) => validateLetterPoints(raw, snapshot),
    maxTokens: 4096,
  });
}
