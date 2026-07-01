import { listLanguages } from '@/lib/db/languages';
import { LanguagesClient } from './languages-client';

export default async function LanguagesPage() {
  const languages = await listLanguages();
  return (
    <div className="max-w-2xl">
      <p className="kicker">Your skeleton</p>
      <h1 className="app-title mt-2">Languages</h1>
      <p className="app-subtitle">
        CEFR levels travel well across Europe — a B2 means the same thing in
        Berlin and Amsterdam. Each CV format renders them its own way.
      </p>
      <div className="mt-8">
        <LanguagesClient languages={languages} />
      </div>
    </div>
  );
}
