import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import { listTracks } from '@/lib/db/tracks';
import { TrackForm } from '@/components/track-form';
import { updateTrackAction } from '../actions';
import { listCvDocuments } from '@/lib/db/cv-documents';
import { GenerateCv } from './GenerateCv';
import { CV_LOCALES, type CvLocale } from '@/lib/cv/types';

export default async function EditTrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const track = (await listTracks()).find((t) => t.id === id);
  if (!track) notFound();

  const cvDocs = await listCvDocuments(id);
  // Tracks may carry a default_locale outside the rendered set (e.g. 'fr'); fall back so the <select> stays in sync.
  const defaultLocale: CvLocale = CV_LOCALES.includes(track.default_locale as CvLocale)
    ? (track.default_locale as CvLocale)
    : 'uk';

  return (
    <div className="max-w-2xl">
      <Link
        href="/dashboard/tracks"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
      >
        <ArrowLeft className="h-4 w-4" />
        All tracks
      </Link>
      <h1 className="app-title mt-4">{track.name}</h1>
      <p className="app-subtitle">
        Edit the track, then generate a locale-correct PDF from it.
      </p>
      <div className="app-card mt-8 p-5">
        <TrackForm track={track} action={updateTrackAction.bind(null, id)} submitLabel="Save changes" />
      </div>
      <GenerateCv
        trackId={id}
        defaultLocale={defaultLocale}
        existingDocs={cvDocs}
      />
    </div>
  );
}
