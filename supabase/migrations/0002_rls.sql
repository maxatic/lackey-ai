-- 0002_rls.sql — RLS for all 9 tables + grants + private profile-photos bucket.
-- Predicate: Clerk 'sub' claim in JWT must equal the row owner column.
-- ponytail: one for-all policy per table covers select/insert/update/delete;
--   users table uses id (PK = Clerk sub), all others use user_id.

-- Grants: make authenticated role the gate, not missing permissions
-- ponytail: broad grant here is intentional; RLS policies below are the actual security gate
grant usage on schema public to authenticated, anon;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;

-- ── Enable RLS ────────────────────────────────────────────────────────────────
alter table users            enable row level security;
alter table personal_profile enable row level security;
alter table entries          enable row level security;
alter table bullets          enable row level security;
alter table skills           enable row level security;
alter table languages        enable row level security;
alter table career_tracks    enable row level security;
alter table track_entries    enable row level security;
alter table track_skills     enable row level security;

-- ── Per-owner policies ────────────────────────────────────────────────────────
-- users: PK `id` IS the Clerk sub (no user_id column)
create policy users_owner on users
  for all
  using      ((auth.jwt() ->> 'sub') = id)
  with check ((auth.jwt() ->> 'sub') = id);

create policy personal_profile_owner on personal_profile
  for all
  using      ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

create policy entries_owner on entries
  for all
  using      ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

create policy bullets_owner on bullets
  for all
  using      ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

create policy skills_owner on skills
  for all
  using      ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

create policy languages_owner on languages
  for all
  using      ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

create policy career_tracks_owner on career_tracks
  for all
  using      ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

create policy track_entries_owner on track_entries
  for all
  using      ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

create policy track_skills_owner on track_skills
  for all
  using      ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

-- ── Private storage bucket ────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', false)
on conflict (id) do nothing;

-- Object path convention: "<user_sub>/<filename>"
-- storage.foldername(name)[1] = first path segment = owner sub
create policy profile_photos_owner_select on storage.objects
  for select
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

create policy profile_photos_owner_insert on storage.objects
  for insert
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

create policy profile_photos_owner_update on storage.objects
  for update
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  )
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

create policy profile_photos_owner_delete on storage.objects
  for delete
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );
