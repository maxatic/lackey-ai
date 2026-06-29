import type { EntryKind } from '@/lib/db/entry-kinds';

export type CvLocale = 'uk' | 'de';
export const CV_LOCALES: CvLocale[] = ['uk', 'de'];

export type CvEntry = {
  kind: EntryKind;
  title: string;
  organization: string | null;
  location: string | null;
  start_date: string | null; // ISO 'YYYY-MM-DD' or null
  end_date: string | null;
  is_current: boolean;
  summary: string | null;
  details: Record<string, string>;
  bullets: string[]; // ordered bullet text
};

export type CvData = {
  locale: CvLocale;
  profile: {
    full_name: string | null;
    headline: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    links: { label: string; url: string }[];
    date_of_birth: string | null; // DE-only consumers
    nationality: string | null;
    marital_status: string | null;
  };
  track: { name: string; target_title: string | null; summary: string | null };
  entries: CvEntry[]; // ordered by the Track's track_entries.sort_order
  skills: { name: string; category: string | null }[]; // ordered
  languages: { name: string; cefr_level: string }[];
};
