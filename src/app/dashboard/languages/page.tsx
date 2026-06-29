import { listLanguages } from '@/lib/db/languages';
import { LanguagesClient } from './languages-client';

export default async function LanguagesPage() {
  const languages = await listLanguages();
  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold">Languages</h1>
      <LanguagesClient languages={languages} />
    </div>
  );
}
