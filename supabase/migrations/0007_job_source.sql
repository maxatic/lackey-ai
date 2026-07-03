-- 0007_job_source.sql — provenance columns for search-saved jobs + idempotent-save index.
-- No new table, no new RLS (job_descriptions_owner covers new columns).

alter table job_descriptions
  add column source text,
  add column source_id text;

-- One saved copy per (user, source, listing). Paste-created jobs have source null (index doesn't apply).
create unique index job_descriptions_source_uniq
  on job_descriptions (user_id, source, source_id)
  where source is not null;
