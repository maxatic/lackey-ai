// Client-safe UI metadata for entry kinds. No server imports — safe to use in 'use client' components.
import type { Database } from './database.types';

export type EntryKind = Database['public']['Enums']['entry_kind'];

export const KIND_LABELS: Record<EntryKind, string> = {
  experience: 'Experience',
  education: 'Education',
  project: 'Project',
  certification: 'Certification',
  award: 'Award',
  publication: 'Publication',
  volunteering: 'Volunteering',
};

export const DETAIL_FIELDS: Record<EntryKind, { key: string; label: string }[]> = {
  experience: [{ key: 'employment_type', label: 'Employment type' }],
  education: [
    { key: 'degree', label: 'Degree' },
    { key: 'field_of_study', label: 'Field of study' },
    { key: 'grade', label: 'Grade' },
  ],
  project: [
    { key: 'url', label: 'URL' },
    { key: 'role', label: 'Role' },
  ],
  certification: [
    { key: 'credential_id', label: 'Credential ID' },
    { key: 'url', label: 'URL' },
    { key: 'issued', label: 'Issued' },
    { key: 'expires', label: 'Expires' },
  ],
  publication: [
    { key: 'url', label: 'URL' },
    { key: 'venue', label: 'Venue' },
  ],
  award: [{ key: 'issuer', label: 'Issuer' }],
  volunteering: [{ key: 'cause', label: 'Cause' }],
};

export const ENTRY_KINDS = Object.keys(KIND_LABELS) as EntryKind[];

export const KIND_DESCRIPTIONS: Record<EntryKind, string> = {
  experience: 'Roles and positions — the core of most CVs.',
  education: 'Degrees, schools and academic background.',
  project: 'Side projects, open source and portfolio work.',
  certification: 'Professional certs, licenses and credentials.',
  award: 'Honours, prizes and recognitions.',
  publication: 'Papers, articles and written work.',
  volunteering: 'Community work and unpaid roles.',
};

export function isEntryKind(value: string): value is EntryKind {
  return ENTRY_KINDS.includes(value as EntryKind);
}
