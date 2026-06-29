import Link from 'next/link';
import { listTracks } from '@/lib/db/tracks';
import { deleteTrackAction } from './actions';

export default async function TracksPage() {
  const tracks = await listTracks();

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Career Tracks</h1>
        <Link href="/dashboard/tracks/new" className="rounded bg-black px-4 py-2 text-white">
          New track
        </Link>
      </div>

      {tracks.length === 0 ? (
        <p className="text-gray-500">No tracks yet. Create your first one.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tracks.map((t) => (
            <li key={t.id} className="flex items-center justify-between rounded border p-3">
              <div>
                <Link href={`/dashboard/tracks/${t.id}`} className="font-medium hover:underline">
                  {t.name}
                </Link>
                {t.target_title ? (
                  <span className="ml-2 text-sm text-gray-500">{t.target_title}</span>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/dashboard/tracks/${t.id}/curate`} className="text-sm underline">
                  Curate
                </Link>
                <form action={deleteTrackAction.bind(null, t.id)}>
                  <button type="submit" className="text-sm text-red-600 hover:underline">
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
