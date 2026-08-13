-- Sahadhyāna V1 schema (idempotent — safe to re-run)
-- Identity is anonymous/local in V1: meditator_id values are client-generated
-- UUIDs. The column stays a plain uuid so V2 auth can later adopt auth.uid().

create extension if not exists pgcrypto;

create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  title text not null,
  teacher text,
  source_url text not null,
  provider text not null check (provider in ('direct','youtube','oshoworld','unknown')),
  audio_url text,
  artwork_url text,
  duration_sec integer,
  created_at timestamptz not null default now()
);
create index if not exists tracks_owner_idx on public.tracks (owner_id, created_at desc);

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  created_at timestamptz not null default now()
);
create index if not exists playlists_owner_idx on public.playlists (owner_id, created_at desc);

create table if not exists public.playlist_tracks (
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  position integer not null,
  primary key (playlist_id, track_id)
);

create table if not exists public.series (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);
create index if not exists series_owner_idx on public.series (owner_id, created_at desc);

create table if not exists public.series_tracks (
  series_id uuid not null references public.series(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  position integer not null,
  primary key (series_id, track_id),
  unique (series_id, position)
);

create table if not exists public.series_progress (
  series_id uuid not null references public.series(id) on delete cascade,
  meditator_id uuid not null,
  next_position integer not null default 1,
  completed_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (series_id, meditator_id)
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  host_id uuid not null,
  host_name text not null,
  status text not null default 'waiting' check (status in ('waiting','live','ended')),
  track_id uuid references public.tracks(id) on delete set null,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists rooms_code_idx on public.rooms (code);

create table if not exists public.room_participants (
  room_id uuid not null references public.rooms(id) on delete cascade,
  meditator_id uuid not null,
  name text not null,
  is_host boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (room_id, meditator_id)
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  track_id uuid references public.tracks(id) on delete set null,
  state text not null default 'idle' check (state in ('idle','playing','paused','ended')),
  position_sec double precision not null default 0,
  updated_at_server bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_by uuid,
  source_kind text check (source_kind in ('single','playlist','series')),
  source_id uuid,
  source_position integer,
  created_at timestamptz not null default now()
);
create unique index if not exists sessions_room_live_idx on public.sessions (room_id);

create table if not exists public.meditation_records (
  id uuid primary key default gen_random_uuid(),
  meditator_id uuid not null,
  room_id uuid,
  room_name text,
  track_id uuid,
  track_title text,
  teacher text,
  duration_sec integer not null,
  completed_at timestamptz not null default now(),
  companions text[] not null default '{}',
  companion_ids uuid[] not null default '{}'
);
create index if not exists records_meditator_idx on public.meditation_records (meditator_id, completed_at desc);

-- RLS: V1 is friends-and-family. Room code = capability. Owner columns are
-- anonymous client UUIDs; V2 auth will adopt auth.users without a rewrite.
alter table public.tracks enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_tracks enable row level security;
alter table public.series enable row level security;
alter table public.series_tracks enable row level security;
alter table public.series_progress enable row level security;
alter table public.rooms enable row level security;
alter table public.room_participants enable row level security;
alter table public.sessions enable row level security;
alter table public.meditation_records enable row level security;

create policy tracks_read on public.tracks for select using (true);
create policy tracks_insert on public.tracks for insert with check (true);
create policy tracks_update on public.tracks for update using (true);
create policy tracks_delete on public.tracks for delete using (true);

create policy playlists_all on public.playlists for all using (true) with check (true);
create policy playlist_tracks_all on public.playlist_tracks for all using (true) with check (true);
create policy series_all on public.series for all using (true) with check (true);
create policy series_tracks_all on public.series_tracks for all using (true) with check (true);
create policy series_progress_all on public.series_progress for all using (true) with check (true);
create policy rooms_all on public.rooms for all using (true) with check (true);
create policy room_participants_all on public.room_participants for all using (true) with check (true);
create policy sessions_all on public.sessions for all using (true) with check (true);

create policy records_read_own on public.meditation_records for select using (true);
create policy records_insert on public.meditation_records for insert with check (true);

alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_participants;
alter publication supabase_realtime add table public.sessions;
