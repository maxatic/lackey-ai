import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import { listEntries } from '@/lib/db/entries';
import { listSkills } from '@/lib/db/skills';
import { listTracks } from '@/lib/db/tracks';
import { getTrackEntryIds, getTrackSkillIds } from '@/lib/db/curation';
import { CurateEditor } from './CurateEditor';

export default async function CuratePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: trackId } = await params;

  const tracks = await listTracks();
  const track = tracks.find((t) => t.id === trackId);
  if (!track) notFound();

  const [entries, skills, selectedEntryIds, selectedSkillIds] =
    await Promise.all([
      listEntries(),
      listSkills(),
      getTrackEntryIds(trackId),
      getTrackSkillIds(trackId),
    ]);

  return (
    <div className="max-w-3xl space-y-8">
      <header>
        <Link
          href={`/dashboard/tracks/${trackId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to track
        </Link>
        <h1 className="app-title mt-4">
          Curate <span className="italic text-[var(--accent)]">{track.name}</span>
        </h1>
        <p className="app-subtitle">
          Choose which entries and skills appear on this track&rsquo;s CV, and
          the order they appear in.
        </p>
      </header>
      <CurateEditor
        trackId={trackId}
        entries={entries.map((e) => ({
          id: e.id,
          label: e.organization ? `${e.title} — ${e.organization}` : e.title,
        }))}
        skills={skills.map((s) => ({ id: s.id, label: s.name }))}
        initialEntryIds={selectedEntryIds}
        initialSkillIds={selectedSkillIds}
      />
    </div>
  );
}
