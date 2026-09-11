-- Church Translation — Supabase schema
-- Run this in the Supabase SQL editor once per project.
-- Do not put OpenAI keys in auth metadata or client-readable tables.

create table if not exists public.churches (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.church_operators (
  user_id uuid not null references auth.users (id) on delete cascade,
  church_id uuid not null references public.churches (id) on delete cascade,
  role text not null default 'operator' check (role in ('operator', 'admin')),
  created_at timestamptz not null default now(),
  primary key (user_id, church_id)
);

create table if not exists public.church_secrets (
  church_id uuid primary key references public.churches (id) on delete cascade,
  encrypted_openai_api_key text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.translation_session_events (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  output_language text not null,
  created_at timestamptz not null default now()
);

create index if not exists church_operators_church_id_idx
  on public.church_operators (church_id);

create index if not exists translation_session_events_church_created_idx
  on public.translation_session_events (church_id, created_at desc);

create index if not exists translation_session_events_user_created_idx
  on public.translation_session_events (user_id, created_at desc);

alter table public.churches enable row level security;
alter table public.church_operators enable row level security;
alter table public.church_secrets enable row level security;
alter table public.translation_session_events enable row level security;

-- Operators can see their own church name. They cannot read secrets.
create policy "operators_read_own_church"
  on public.churches
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.church_operators
      where church_operators.church_id = churches.id
        and church_operators.user_id = auth.uid()
    )
  );

create policy "operators_read_own_membership"
  on public.church_operators
  for select
  to authenticated
  using (user_id = auth.uid());

-- church_secrets and translation_session_events have no client policies.
-- The server reads and writes them with the service role key.
