// ponytail: static UI metadata for the German market (Lebenslauf conventions).
export const LOCALE_FIELD_FLAGS = {
  photo: ['🇩🇪'],
  date_of_birth: ['🇩🇪'],
  nationality: ['🇩🇪'],
  marital_status: ['🇩🇪'],
  gender: ['🇩🇪'],
  driving_license: ['🇩🇪'],
} as const;

export type LocaleField = keyof typeof LOCALE_FIELD_FLAGS;
