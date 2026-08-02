// src/components/LocaleHint.tsx
import { LOCALE_FIELD_FLAGS, type LocaleField } from '@/lib/locale-fields';

export function LocaleHint({ field }: { field: LocaleField }) {
  const flags = LOCALE_FIELD_FLAGS[field];
  return (
    <span
      aria-label="Expected on a German Lebenslauf"
      title="Expected on a German Lebenslauf"
      className="ml-2 text-sm"
    >
      {flags.join('')}
    </span>
  );
}
