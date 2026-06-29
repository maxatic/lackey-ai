import { notFound } from 'next/navigation';
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
        <h1 className="text-2xl font-semibold">Curate: {track.name}</h1>
        <p className="text-sm text-gray-500">
          Choose which entries and skills appear, and order them.
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
