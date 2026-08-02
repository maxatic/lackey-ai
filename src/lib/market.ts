import type { CvLocale } from '@/lib/cv/types';

/** Product scope: Germany-only for now. */
export const MARKET_COUNTRY = 'de' as const;
export const MARKET_COUNTRY_LABEL = 'Germany';

export const DEFAULT_CV_LOCALE: CvLocale = 'de';
export const ACTIVE_CV_LOCALES: CvLocale[] = ['de'];

export const DEFAULT_TRACK_LOCALE = 'de-DE';
