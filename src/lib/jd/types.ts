export type ParsedJd = {
  title: string;
  company: string | null;
  location: string | null;
  language: string | null; // e.g. 'en', 'de' — informational at MVP
  requirements: string[];
  keywords: string[];
};
