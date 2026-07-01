'use client';
import { useTransition, useState } from 'react';
import { FilePdf } from '@phosphor-icons/react';
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
      className="action-link disabled:opacity-50"
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
    <div className="mt-6 flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="app-card flex flex-col gap-4 p-5">
        <h2 className="section-title">Generate CV</h2>
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="cv-locale" className="field-label !mb-0">
            Locale
          </label>
          <select
            id="cv-locale"
            value={locale}
            onChange={(e) => setLocale(e.target.value as CvLocale)}
            className="field !w-auto"
          >
            {CV_LOCALES.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
          <button type="submit" disabled={isPending} className="btn btn-primary">
            <FilePdf className="h-4 w-4" weight="bold" />
            {isPending ? 'Generating…' : 'Generate PDF'}
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}
        {downloadUrl && (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="action-link"
          >
            Download CV (link valid 10 min)
          </a>
        )}
      </form>

      {existingDocs.length > 0 && (
        <section>
          <h2 className="section-title">Generated CVs</h2>
          <ul className="app-card mt-3 overflow-hidden">
            {existingDocs.map((doc) => (
              <li key={doc.locale} className="app-row !py-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="chip uppercase">{doc.locale}</span>
                  <span className="tabular text-xs text-[var(--ink-soft)]">
                    {new Date(doc.updated_at).toLocaleString()}
                  </span>
                </div>
                <RedownloadButton storagePath={doc.storage_path} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
