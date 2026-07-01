import { callStructured } from '@/lib/ai/client';
import type { ParsedJd } from './types';

export const JD_MAX_CHARS = 20_000;

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((s) => typeof s === 'string');
const isNullableString = (v: unknown): v is string | null =>
  v === null || typeof v === 'string';

export function validateParsedJd(raw: unknown): ParsedJd | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.title !== 'string' || !r.title.trim()) return null;
  if (!isNullableString(r.company) || !isNullableString(r.location) || !isNullableString(r.language)) return null;
  if (!isStringArray(r.requirements) || !isStringArray(r.keywords)) return null;
  return {
    title: r.title,
    company: r.company,
    location: r.location,
    language: r.language,
    requirements: r.requirements,
    keywords: r.keywords,
  };
}

const JD_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'The job title' },
    company: { type: ['string', 'null'], description: 'Hiring company, null if not stated' },
    location: { type: ['string', 'null'], description: 'Job location, null if not stated' },
    language: { type: ['string', 'null'], description: "ISO language code of the posting, e.g. 'en' or 'de'" },
    requirements: { type: 'array', items: { type: 'string' }, description: 'Distilled requirement lines, one per item' },
    keywords: { type: 'array', items: { type: 'string' }, description: 'ATS-relevant terms and technologies' },
  },
  required: ['title', 'company', 'location', 'language', 'requirements', 'keywords'],
  additionalProperties: false,
} as const;

export async function parseJd(rawText: string): Promise<ParsedJd> {
  const text = rawText.trim();
  if (!text) throw new Error('Job description is empty');
  if (text.length > JD_MAX_CHARS) {
    throw new Error('Job description is too long (max 20,000 characters)');
  }
  return callStructured<ParsedJd>({
    system:
      'You extract structured data from job descriptions. Extract only what the text states — never invent or embellish. Keep requirement lines short and concrete.',
    user: `Extract the structured job description from the following posting:\n\n${text}`,
    toolName: 'record_parsed_jd',
    toolDescription: 'Record the structured fields extracted from the job description.',
    inputSchema: JD_SCHEMA as unknown as Record<string, unknown>,
    validate: validateParsedJd,
    maxTokens: 2048,
  });
}
