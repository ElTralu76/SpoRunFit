-- ============================================================
-- SpoRunFit — Schéma Phase 1
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

-- Table users (complète le profil auth.users)
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text not null,
  notification_preferences jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.users enable row level security;

create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- Trigger : crée le profil users à l'inscription
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Table follows (avant sessions car les policies sessions la référencent)
create table if not exists public.follows (
  follower_id uuid references public.users(id) on delete cascade,
  following_id uuid references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);

alter table public.follows enable row level security;

create policy "Users can manage own follows"
  on public.follows for all
  using (auth.uid() = follower_id);

create policy "Anyone can view follows"
  on public.follows for select
  using (true);

-- Table sessions
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  date date not null,
  type text not null check (type in ('run', 'crossfit', 'renfo', 'autre')),
  source text not null default 'manual' check (source in ('manual', 'garmin', 'generated')),
  visibility text not null default 'friends' check (visibility in ('private', 'friends', 'public')),
  status text not null default 'completed' check (status in ('planned', 'completed', 'skipped')),
  duration integer,
  notes text,
  data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.sessions enable row level security;

create policy "Users can view own sessions"
  on public.sessions for select
  using (
    auth.uid() = user_id
    or visibility = 'public'
    or (
      visibility = 'friends'
      and exists (
        select 1 from public.follows
        where follower_id = auth.uid() and following_id = user_id
      )
    )
  );

create policy "Users can insert own sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on public.sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete own sessions"
  on public.sessions for delete
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger sessions_updated_at
  before update on public.sessions
  for each row execute function public.set_updated_at();

-- Table wods (référence CrossFit)
create table if not exists public.wods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  type text check (type in ('time', 'rounds', 'reps', 'weight')),
  source text not null default 'predefined' check (source in ('predefined', 'user_submitted')),
  created_at timestamptz default now()
);

alter table public.wods enable row level security;

create policy "Anyone can read wods"
  on public.wods for select
  using (true);

insert into public.wods (name, description, type, source) values
  ('Fran', '21-15-9 Thrusters (43/29kg) + Pull-ups', 'time', 'predefined'),
  ('Grace', '30 Clean & Jerks (61/43kg)', 'time', 'predefined'),
  ('Helen', '3 rounds: 400m run + 21 KB swings (24/16kg) + 12 Pull-ups', 'time', 'predefined'),
  ('Cindy', '20min AMRAP: 5 Pull-ups + 10 Push-ups + 15 Air squats', 'rounds', 'predefined'),
  ('Murph', '1 mile run + 100 Pull-ups + 200 Push-ups + 300 Squats + 1 mile run', 'time', 'predefined'),
  ('Annie', '50-40-30-20-10 Double-unders + Sit-ups', 'time', 'predefined'),
  ('Barbara', '5 rounds: 20 Pull-ups + 30 Push-ups + 40 Sit-ups + 50 Squats (3min rest)', 'time', 'predefined'),
  ('Kelly', '5 rounds: 400m run + 30 Box jumps (24/20in) + 30 Wall balls (9/6kg)', 'time', 'predefined')
on conflict (name) do nothing;

-- Table personal_records
create table if not exists public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  movement text not null,
  value numeric not null,
  unit text not null default 'kg' check (unit in ('kg', 'seconds', 'reps', 'rounds')),
  date date not null,
  session_id uuid references public.sessions(id) on delete set null,
  source text not null default 'auto_detected' check (source in ('auto_detected', 'manual')),
  created_at timestamptz default now()
);

alter table public.personal_records enable row level security;

create policy "Users can view own PRs"
  on public.personal_records for select
  using (auth.uid() = user_id);

create policy "Users can insert own PRs"
  on public.personal_records for insert
  with check (auth.uid() = user_id);

-- Table reactions
create table if not exists public.reactions (
  session_id uuid references public.sessions(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  primary key (session_id, user_id)
);

alter table public.reactions enable row level security;

create policy "Users can manage own reactions"
  on public.reactions for all
  using (auth.uid() = user_id);

create policy "Anyone can view reactions"
  on public.reactions for select
  using (true);
