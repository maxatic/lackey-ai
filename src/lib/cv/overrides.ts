import type { TrackSnapshot } from './data';

export type CvOverrides = {
  entry_order?: string[];
  entry_exclude?: string[];
  skill_order?: string[];
  skill_exclude?: string[];
  bullet_rewrites?: { bullet_id: string; suggested_text: string; reason?: string }[];
  summary_rewrite?: { suggested_text: string; reason?: string } | null;
  headline_rewrite?: { suggested_text: string; reason?: string } | null;
};

function reorder<T extends { id: string }>(items: T[], order?: string[], exclude?: string[]): T[] {
  const excluded = new Set(exclude ?? []);
  const kept = items.filter((i) => !excluded.has(i.id));
  if (!order?.length) return kept;
  const byId = new Map(kept.map((i) => [i.id, i]));
  const ordered = order.map((id) => byId.get(id)).filter((i): i is T => !!i);
  const placed = new Set(ordered.map((i) => i.id));
  return [...ordered, ...kept.filter((i) => !placed.has(i.id))];
}

export function applyOverrides(snapshot: TrackSnapshot, overrides: CvOverrides): TrackSnapshot {
  const rewrites = new Map((overrides.bullet_rewrites ?? []).map((r) => [r.bullet_id, r.suggested_text]));
  return {
    track: {
      ...snapshot.track,
      summary: overrides.summary_rewrite?.suggested_text ?? snapshot.track.summary,
    },
    profile: {
      ...snapshot.profile,
      headline: overrides.headline_rewrite?.suggested_text ?? snapshot.profile.headline,
    },
    entries: reorder(snapshot.entries, overrides.entry_order, overrides.entry_exclude).map((e) => ({
      ...e,
      bullets: e.bullets.map((b) => ({ ...b, text: rewrites.get(b.id) ?? b.text })),
    })),
    skills: reorder(snapshot.skills, overrides.skill_order, overrides.skill_exclude),
    languages: snapshot.languages,
  };
}

const strArr = (v: unknown): string[] | undefined =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : undefined;
const rewriteObj = (v: unknown): { suggested_text: string; reason?: string } | undefined => {
  if (!v || typeof v !== 'object') return undefined;
  const r = v as Record<string, unknown>;
  if (typeof r.suggested_text !== 'string') return undefined;
  return { suggested_text: r.suggested_text, ...(typeof r.reason === 'string' ? { reason: r.reason } : {}) };
};

// Trust boundary: overrides arrive from the client / AI as jsonb — sanitize, never throw.
export function validateOverrides(raw: unknown): CvOverrides {
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as Record<string, unknown>;
  const out: CvOverrides = {};
  const eo = strArr(r.entry_order); if (eo) out.entry_order = eo;
  const ee = strArr(r.entry_exclude); if (ee) out.entry_exclude = ee;
  const so = strArr(r.skill_order); if (so) out.skill_order = so;
  const se = strArr(r.skill_exclude); if (se) out.skill_exclude = se;
  if (Array.isArray(r.bullet_rewrites)) {
    const brs = r.bullet_rewrites
      .map((b) => {
        if (!b || typeof b !== 'object') return null;
        const o = b as Record<string, unknown>;
        if (typeof o.bullet_id !== 'string' || typeof o.suggested_text !== 'string') return null;
        return { bullet_id: o.bullet_id, suggested_text: o.suggested_text, ...(typeof o.reason === 'string' ? { reason: o.reason } : {}) };
      })
      .filter((b): b is NonNullable<typeof b> => !!b);
    if (brs.length) out.bullet_rewrites = brs;
  }
  const sr = rewriteObj(r.summary_rewrite); if (sr) out.summary_rewrite = sr;
  const hr = rewriteObj(r.headline_rewrite); if (hr) out.headline_rewrite = hr;
  return out;
}
