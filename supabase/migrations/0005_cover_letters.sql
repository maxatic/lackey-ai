-- 0005_cover_letters.sql — cover_letters table + RLS.
-- Mirrors 0004 style: owner RLS via auth.jwt() ->> 'sub'.

create table cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  job_id uuid not null references job_descriptions(id) on delete cascade,
  track_id uuid not null references career_tracks(id) on delete cascade,
  points jsonb not null default '[]',
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, track_id)
);

alter table cover_letters enable row level security;

create policy cover_letters_owner on cover_letters
  for all
  using      ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);
