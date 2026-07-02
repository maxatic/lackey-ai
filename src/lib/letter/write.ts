import { callStructured } from '@/lib/ai/client';
import type { ParsedJd } from '@/lib/jd/types';
import type { LetterPoint } from './types';

const BODY_SCHEMA = {
  type: 'object',
  properties: {
    body: { type: 'string', description: 'The complete cover letter as plain text' },
  },
  required: ['body'],
  additionalProperties: false,
} as const;

export async function writeLetter(
  jd: ParsedJd,
  points: LetterPoint[],
  profile: { full_name: string | null; headline: string | null },
): Promise<string> {
  return callStructured<string>({
    system: [
      'You write cover letters. Professional but human tone — no stiff boilerplate, no exclamation marks, no flattery padding.',
      'HARD RULES: use ONLY the given talking points as factual claims about the candidate; do not add experience, skills, or achievements beyond them.',
      'Write in English, roughly 250-350 words, plain text for pasting into a form or email: no address block, no date line, no placeholder brackets like [Company].',
      'Greet with the company name when known, otherwise use a neutral professional greeting. Sign off with the candidate\'s name.',
    ].join(' '),
    user: [
      `JOB DESCRIPTION (parsed):\n${JSON.stringify(jd, null, 2)}`,
      `CANDIDATE: ${profile.full_name ?? 'the candidate'}${profile.headline ? ` — ${profile.headline}` : ''}`,
      `TALKING POINTS (the only permitted factual claims):\n${points.map((p, i) => `${i + 1}. ${p.text}`).join('\n')}`,
    ].join('\n\n'),
    toolName: 'record_letter',
    toolDescription: 'Record the finished cover letter text.',
    inputSchema: BODY_SCHEMA as unknown as Record<string, unknown>,
    validate: (raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const body = (raw as Record<string, unknown>).body;
      return typeof body === 'string' && body.trim() ? body : null;
    },
    maxTokens: 4096,
  });
}
