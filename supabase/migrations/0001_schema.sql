create type entry_kind as enum ('experience','education','project','certification','award','publication','volunteering');

create table users (
  id text primary key,
  default_locale text not null default 'en-GB',
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

create table personal_profile (
  user_id text primary key references users(id) on delete cascade,
  full_name text, headline text, email text, phone text, location text,
  links jsonb not null default '[]',
  photo_url text, date_of_birth date, nationality text, marital_status text, gender text, driving_license text,
  updated_at timestamptz not null default now()
);

create table entries (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  kind entry_kind not null,
  title text not null,
  organization text, location text,
  start_date date, end_date date,
  is_current boolean not null default false,
  summary text,
  details jsonb not null default '{}',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index entries_user_kind_idx on entries(user_id, kind);

create table bullets (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  entry_id uuid not null references entries(id) on delete cascade,
  text text not null,
  tags text[] not null default '{}',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index bullets_entry_idx on bullets(entry_id);
create index bullets_tags_gin on bullets using gin(tags);

create table skills (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  name text not null, category text, proficiency text,
  sort_order int not null default 0
);

create table languages (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  name text not null, cefr_level text not null
);

create table career_tracks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  name text not null, target_title text,
  summary text, default_locale text, default_template text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table track_entries (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  track_id uuid not null references career_tracks(id) on delete cascade,
  entry_id uuid not null references entries(id) on delete cascade,
  sort_order int not null default 0,
  unique (track_id, entry_id)
);

create table track_skills (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  track_id uuid not null references career_tracks(id) on delete cascade,
  skill_id uuid not null references skills(id) on delete cascade,
  sort_order int not null default 0,
  unique (track_id, skill_id)
);
