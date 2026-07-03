import { listSavedSourceIds } from '@/lib/db/jobs';
import { SearchClient } from './SearchClient';

// Server actions run under the invoking route's config. Apify's sync run can
// take ~20-30s; Vercel's default function window is shorter than that.
export const maxDuration = 60;

export default async function SearchPage() {
  const saved = await listSavedSourceIds();
  return (
    <div className="max-w-4xl">
      <p className="kicker">Discover</p>
      <h1 className="app-title mt-2">Find jobs</h1>
      <p className="app-subtitle">
        Search EU job listings and save the good ones straight into your pipeline.
      </p>
      <div className="mt-8">
        <SearchClient initialSavedKeys={saved.map((s) => `${s.source}:${s.source_id}`)} />
      </div>
    </div>
  );
}
