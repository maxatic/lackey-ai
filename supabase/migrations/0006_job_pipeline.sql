-- 0006_job_pipeline.sql — pipeline status + applied date + notes on job_descriptions.
-- No new table, no new RLS: the existing job_descriptions_owner policy covers new columns.

alter table job_descriptions
  add column status text not null default 'saved'
    constraint job_descriptions_status_check
    check (status in ('saved','prepared','applied','interviewing','offer','rejected')),
  add column applied_at timestamptz,
  add column notes text not null default '';
