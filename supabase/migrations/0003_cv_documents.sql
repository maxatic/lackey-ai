-- 0003_cv_documents.sql — cv_documents table + RLS + private cvs bucket.
-- Mirrors 0002_rls.sql style: snake_case policy names, multi-line form, with check on update.

create table cv_documents (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  track_id uuid not null references career_tracks(id) on delete cascade,
  locale text not null,
  storage_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (track_id, locale)
);

alter table cv_documents enable row level security;

create policy cv_documents_owner on cv_documents
  for all
  using      ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

-- Private bucket for rendered CVs (owner-prefixed paths), mirroring profile-photos.
insert into storage.buckets (id, name, public)
values ('cvs', 'cvs', false)
on conflict (id) do nothing;

-- Object path convention: "<user_sub>/<filename>"
-- storage.foldername(name)[1] = first path segment = owner sub
create policy cvs_owner_select on storage.objects
  for select
  using (
    bucket_id = 'cvs'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

create policy cvs_owner_insert on storage.objects
  for insert
  with check (
    bucket_id = 'cvs'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

create policy cvs_owner_update on storage.objects
  for update
  using (
    bucket_id = 'cvs'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  )
  with check (
    bucket_id = 'cvs'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

create policy cvs_owner_delete on storage.objects
  for delete
  using (
    bucket_id = 'cvs'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );
