// src/lib/locale-fields.ts
// ponytail: static UI metadata, not DB. Product-tunable per spec §6.
export const LOCALE_FIELD_FLAGS = {
  photo: ['🇩🇪', '🇦🇹', '🇨🇭', '🇫🇷'],
  date_of_birth: ['🇩🇪', '🇦🇹', '🇨🇭'],
  nationality: ['🇩🇪', '🇦🇹', '🇫🇷'],
  marital_status: ['🇩🇪', '🇦🇹'],
  gender: ['🇩🇪'],
  driving_license: ['🇩🇪', '🇫🇷'],
} as const;

export type LocaleField = keyof typeof LOCALE_FIELD_FLAGS;
