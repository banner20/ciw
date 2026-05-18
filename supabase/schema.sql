-- ============================================================
-- CIW — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- user settings (idea columns, preferences)
create table if not exists public.user_settings (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  idea_columns jsonb not null default '[]'
);
alter table public.user_settings enable row level security;
create policy "Users manage own settings" on public.user_settings
  for all using (auth.uid() = user_id);

-- projects
create table if not exists public.projects (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  payload    jsonb not null
);
alter table public.projects enable row level security;
create policy "Users manage own projects" on public.projects
  for all using (auth.uid() = user_id);

-- videos
create table if not exists public.videos (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  project_id text,
  platform   text,
  created_at timestamptz default now(),
  payload    jsonb not null
);
alter table public.videos enable row level security;
create policy "Users manage own videos" on public.videos
  for all using (auth.uid() = user_id);
create index if not exists videos_user_id_idx on public.videos(user_id);

-- segments
create table if not exists public.segments (
  id       text primary key,
  user_id  uuid not null references auth.users(id) on delete cascade,
  video_id text,
  payload  jsonb not null
);
alter table public.segments enable row level security;
create policy "Users manage own segments" on public.segments
  for all using (auth.uid() = user_id);

-- tags
create table if not exists public.tags (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text,
  category   text,
  created_at timestamptz default now(),
  payload    jsonb not null
);
alter table public.tags enable row level security;
create policy "Users manage own tags" on public.tags
  for all using (auth.uid() = user_id);

-- insights
create table if not exists public.insights (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  payload    jsonb not null
);
alter table public.insights enable row level security;
create policy "Users manage own insights" on public.insights
  for all using (auth.uid() = user_id);

-- ideas
create table if not exists public.ideas (
  id             text primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  project_id     text,
  status         text default 'draft',
  scheduled_date date,
  created_at     timestamptz default now(),
  payload        jsonb not null
);
alter table public.ideas enable row level security;
create policy "Users manage own ideas" on public.ideas
  for all using (auth.uid() = user_id);
create index if not exists ideas_user_id_idx   on public.ideas(user_id);
create index if not exists ideas_status_idx    on public.ideas(status);
create index if not exists ideas_scheduled_idx on public.ideas(scheduled_date);

-- scripts
create table if not exists public.scripts (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  idea_id    text,
  created_at timestamptz default now(),
  payload    jsonb not null
);
alter table public.scripts enable row level security;
create policy "Users manage own scripts" on public.scripts
  for all using (auth.uid() = user_id);

-- goals
create table if not exists public.goals (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  status     text default 'active',
  created_at timestamptz default now(),
  payload    jsonb not null
);
alter table public.goals enable row level security;
create policy "Users manage own goals" on public.goals
  for all using (auth.uid() = user_id);

-- swipe_items
create table if not exists public.swipe_items (
  id       text primary key,
  user_id  uuid not null references auth.users(id) on delete cascade,
  platform text,
  saved_at timestamptz default now(),
  payload  jsonb not null
);
alter table public.swipe_items enable row level security;
create policy "Users manage own swipe items" on public.swipe_items
  for all using (auth.uid() = user_id);
create index if not exists swipe_items_user_id_idx on public.swipe_items(user_id);
