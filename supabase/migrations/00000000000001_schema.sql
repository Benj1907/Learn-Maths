-- Run this in your Supabase SQL Editor

-- ============================================================
-- Profiles (extends auth.users)
-- ============================================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  role text not null check (role in ('parent', 'child')),
  display_name text not null,
  parent_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Parents can read their children" on public.profiles
  for select using (parent_id = auth.uid());

-- Service role bypasses RLS, so inserts from the admin client work automatically.
-- This policy covers inserts from the trigger function (runs as SECURITY DEFINER):
create policy "Allow profile insert on signup" on public.profiles
  for insert with check (true);

-- ============================================================
-- Exercise attempts
-- ============================================================
create table public.exercise_attempts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  topic text not null check (topic in ('division_decimale', 'fractions_addition', 'fractions_multiplication')),
  question jsonb not null,
  user_answer text not null,
  correct_answer text not null,
  is_correct boolean not null,
  attempted_at timestamptz default now() not null
);

alter table public.exercise_attempts enable row level security;

create policy "Users can insert own attempts" on public.exercise_attempts
  for insert with check (auth.uid() = user_id);

create policy "Users can read own attempts" on public.exercise_attempts
  for select using (auth.uid() = user_id);

create policy "Parents can read children attempts" on public.exercise_attempts
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = exercise_attempts.user_id
        and profiles.parent_id = auth.uid()
    )
  );

-- ============================================================
-- Trigger: auto-create profile from auth metadata
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'child'),
    coalesce(new.raw_user_meta_data->>'display_name', 'Utilisateur')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Grants
-- The Dashboard SQL Editor runs as supabase_admin, which auto-grants
-- table CRUD to anon/authenticated. Migrations (CLI, local dev) run as
-- postgres, which doesn't — so these are required for the CLI/local flow.
-- RLS policies above still gate actual row access.
-- ============================================================
grant select, insert, update, delete on public.profiles to authenticated, service_role;
grant select, insert, update, delete on public.exercise_attempts to authenticated, service_role;
