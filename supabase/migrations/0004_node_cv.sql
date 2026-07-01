-- 0004_node_cv.sql — job_descriptions + node_cvs + cv_documents.job_id.
-- Mirrors 0003 style: owner RLS via auth.jwt() ->> 'sub'.

create table job_descriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  title text not null,
  company text,
  raw_text text not null,
  parsed jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table job_descriptions enable row level security;

create policy job_descriptions_owner on job_descriptions
  for all
  using      ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

create table node_cvs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  job_id uuid not null references job_descriptions(id) on delete cascade,
  track_id uuid not null references career_tracks(id) on delete cascade,
  overrides jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, track_id)
);

alter table node_cvs enable row level security;

create policy node_cvs_owner on node_cvs
  for all
  using      ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

-- cv_documents: nullable job_id; one unique constraint covering master (job_id null)
-- and node (job_id set) rows. NULLS NOT DISTINCT so at most one master row per
-- (track, locale). A plain constraint (not a partial index) so PostgREST upsert
-- on_conflict can infer it.
alter table cv_documents
  add column job_id uuid references job_descriptions(id) on delete cascade;

alter table cv_documents
  drop constraint cv_documents_track_id_locale_key;

alter table cv_documents
  add constraint cv_documents_track_locale_job_key
  unique nulls not distinct (track_id, locale, job_id);
