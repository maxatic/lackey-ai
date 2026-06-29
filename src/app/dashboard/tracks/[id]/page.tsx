import { notFound } from 'next/navigation';
import { listTracks } from '@/lib/db/tracks';
import { TrackForm } from '@/components/track-form';
import { updateTrackAction } from '../actions';

export default async function EditTrackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const track = (await listTracks()).find((t) => t.id === id);
  if (!track) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-2xl font-semibold">Edit Career Track</h1>
      <TrackForm
        track={track}
        action={updateTrackAction.bind(null, id)}
        submitLabel="Save changes"
      />
    </div>
  );
}
