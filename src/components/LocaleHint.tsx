// src/components/LocaleHint.tsx
import { LOCALE_FIELD_FLAGS, type LocaleField } from '@/lib/locale-fields';

export function LocaleHint({ field }: { field: LocaleField }) {
  const flags = LOCALE_FIELD_FLAGS[field];
  return (
    <span
      aria-label="Expected by locale conventions"
      title="Conventionally expected in these locales"
      className="ml-2 text-sm"
    >
      {flags.join('')}
    </span>
  );
}
