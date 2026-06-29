'use client';
import { useTransition, useState } from 'react';
import { CV_LOCALES, type CvLocale } from '@/lib/cv/types';
import { generateCv, getSignedDownloadUrl } from './generate-cv/actions';

interface CvDocStub {
  locale: string;
  storage_path: string;
  updated_at: string;
}

interface Props {
  trackId: string;
  defaultLocale: CvLocale;
  existingDocs?: CvDocStub[];
}

function RedownloadButton({ storagePath }: { storagePath: string }) {
  const [isPending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        start(async () => {
          const { url } = await getSignedDownloadUrl(storagePath);
          window.open(url, '_blank');
        })
      }
      className="text-blue-600 underline text-xs disabled:opacity-50"
    >
      {isPending ? 'Signing…' : 'Download'}
    </button>
  );
}

export function GenerateCv({ trackId, defaultLocale, existingDocs = [] }: Props) {
  const [locale, setLocale] = useState<CvLocale>(defaultLocale);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setDownloadUrl(null);
    const fd = new FormData();
    fd.set('track_id', trackId);
    fd.set('locale', locale);
    startTransition(async () => {
      try {
        const { url } = await generateCv(fd);
        setDownloadUrl(url);
        window.open(url, '_blank');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Generation failed');
      }
    });
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Generate CV</h2>
        <div className="flex items-center gap-3">
          <label htmlFor="cv-locale" className="text-sm font-medium">
            Locale
          </label>
          <select
            id="cv-locale"
            value={locale}
            onChange={(e) => setLocale(e.target.value as CvLocale)}
            className="rounded border px-2 py-1 text-sm"
          >
            {CV_LOCALES.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-blue-600 px-4 py-1 text-sm text-white disabled:opacity-50"
          >
            {isPending ? 'Generating…' : 'Generate PDF'}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {downloadUrl && (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-600 underline"
          >
            Download CV (link valid 10 min)
          </a>
        )}
      </form>

      {existingDocs.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Generated CVs</h2>
          <ul className="flex flex-col gap-2">
            {existingDocs.map((doc) => (
              <li key={doc.locale} className="flex items-center gap-3 text-sm">
                <span className="font-medium uppercase">{doc.locale}</span>
                <span className="text-gray-500 text-xs">
                  {new Date(doc.updated_at).toLocaleString()}
                </span>
                <RedownloadButton storagePath={doc.storage_path} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
