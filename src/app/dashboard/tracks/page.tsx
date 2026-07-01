import Link from 'next/link';
import { Plus } from '@phosphor-icons/react/dist/ssr';
import { listTracks } from '@/lib/db/tracks';
import { deleteTrackAction } from './actions';

export default async function TracksPage() {
  const tracks = await listTracks();

  return (
    <div className="max-w-2xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="kicker">Applications</p>
          <h1 className="app-title mt-2">Career tracks</h1>
        </div>
        <Link href="/dashboard/tracks/new" className="btn btn-primary shrink-0">
          <Plus className="h-4 w-4" weight="bold" />
          New track
        </Link>
      </div>
      <p className="app-subtitle">
        A track is one angle on your profile — &ldquo;Product Manager&rdquo; and
        &ldquo;Data Analyst&rdquo; can share a Skeleton but tell different stories.
      </p>

      <div className="mt-8">
        {tracks.length === 0 ? (
          <div className="empty-state">
            No tracks yet. Create one for the role you are pursuing — it takes a
            minute, and every CV hangs off it.
          </div>
        ) : (
          <ul className="app-card overflow-hidden">
            {tracks.map((t) => (
              <li key={t.id} className="app-row">
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/tracks/${t.id}`}
                    className="text-sm font-semibold text-[var(--ink)] transition-colors hover:text-[var(--accent)]"
                  >
                    {t.name}
                  </Link>
                  {t.target_title ? (
                    <p className="truncate text-sm text-[var(--ink-soft)]">{t.target_title}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Link href={`/dashboard/tracks/${t.id}/curate`} className="action-link">
                    Curate
                  </Link>
                  <form action={deleteTrackAction.bind(null, t.id)}>
                    <button type="submit" className="action-link action-link-danger">
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
