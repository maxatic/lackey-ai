'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { MagnifyingGlass, ArrowSquareOut, Check, Plus } from '@phosphor-icons/react';
import { MARKET_COUNTRY_LABEL } from '@/lib/market';
import type { JobSearchResult } from '@/lib/search/types';
import { searchJobsAction, saveSearchResultAction } from './actions';

export function SearchClient({ initialSavedKeys }: { initialSavedKeys: string[] }) {
  const [results, setResults] = useState<JobSearchResult[] | null>(null);
  const [sourceErrors, setSourceErrors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Map<string, string | null>>(
    () => new Map(initialSavedKeys.map((k) => [k, null])), // key -> jobId (null = saved earlier, id unknown)
  );
  const [isPending, startTransition] = useTransition();
  const [savingKey, setSavingKey] = useState<string | null>(null);

  function search(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await searchJobsAction(fd);
      if ('error' in res) { setError(res.error); return; }
      setResults(res.results);
      setSourceErrors(res.errors);
    });
  }

  function save(r: JobSearchResult) {
    const key = `${r.source}:${r.source_id}`;
    setSavingKey(key);
    startTransition(async () => {
      const res = await saveSearchResultAction(JSON.stringify(r));
      setSavingKey(null);
      if ('error' in res) { setError(res.error); return; }
      setSavedKeys((prev) => new Map(prev).set(key, res.jobId));
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={search} className="app-card flex flex-wrap items-end gap-3 p-5">
        <div className="min-w-56 flex-1">
          <label htmlFor="search-keywords" className="field-label">Keywords</label>
          <input
            id="search-keywords"
            name="keywords"
            required
            minLength={2}
            maxLength={200}
            placeholder="e.g. frontend engineer react"
            className="field"
          />
        </div>
        <p className="pb-2 text-sm text-[var(--ink-soft)]">Searching in {MARKET_COUNTRY_LABEL}</p>
        <label className="flex items-center gap-2 pb-2 text-sm text-[var(--ink)]">
          <input type="checkbox" name="remote" /> Remote only
        </label>
        <button type="submit" disabled={isPending} className="btn btn-primary">
          <MagnifyingGlass className="h-4 w-4" />
          {isPending && !savingKey ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <p className="form-error">{error}</p>}
      {sourceErrors.length > 0 && (
        <p className="text-sm text-[var(--ink-soft)]">
          {sourceErrors.join(' · ')} — showing results from the remaining source.
        </p>
      )}
      {isPending && !savingKey && results === null && (
        <div className="empty-state">Searching both sources — this can take up to ~30 seconds…</div>
      )}
      {results !== null && results.length === 0 && !isPending && (
        <div className="empty-state">No results — try broader keywords or another country.</div>
      )}

      {results !== null && results.length > 0 && (
        <ul className="flex flex-col gap-3">
          {results.map((r) => {
            const key = `${r.source}:${r.source_id}`;
            const savedJobId = savedKeys.has(key) ? savedKeys.get(key) : undefined;
            return (
              <li key={key} className="app-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--ink)]">{r.title}</p>
                    <p className="text-sm text-[var(--ink-soft)]">
                      {[r.company, r.location].filter(Boolean).join(' · ') || '—'}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--ink-soft)]">
                      <span className="chip chip-quiet">{r.source === 'hiringcafe' ? 'Hiring Cafe' : 'Adzuna'}</span>
                      {r.remote === true && <span className="chip chip-quiet">Remote</span>}
                      {r.salary && <span className="tabular">{r.salary}</span>}
                      {r.posted_at && <span className="tabular">{new Date(r.posted_at).toLocaleDateString()}</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {savedJobId !== undefined ? (
                      savedJobId ? (
                        <Link
                          href={`/dashboard/jobs/${savedJobId}`}
                          className="action-link inline-flex items-center gap-1.5"
                        >
                          <Check className="h-4 w-4" weight="bold" /> Saved
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-soft)]">
                          <Check className="h-4 w-4" weight="bold" /> Saved
                        </span>
                      )
                    ) : (
                      <button
                        type="button"
                        disabled={savingKey === key}
                        onClick={() => save(r)}
                        className="btn btn-primary"
                      >
                        <Plus className="h-4 w-4" />
                        {savingKey === key ? 'Saving…' : 'Save to Jobs'}
                      </button>
                    )}
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="action-link inline-flex items-center gap-1.5 text-xs"
                    >
                      <ArrowSquareOut className="h-3.5 w-3.5" /> View posting
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
