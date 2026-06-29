import type { CvData } from './types';
import { render as uk } from './locales/uk';
import { render as de } from './locales/de';

export function renderCv(data: CvData): string {
  return data.locale === 'de' ? de(data) : uk(data);
}
