-- Church login: public membership tables, private secret metadata, Vault for keys.
-- Apply this file in the Supabase SQL editor or with the Supabase CLI.

create extension if not exists pgcrypto;
create extension if not exists supabase_vault;

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

grant usage on schema private to postgres;
grant usage on schema private to service_role;
grant all on all tables in schema private to postgres;
grant all on all tables in schema private to service_role;
grant all on all functions in schema private to postgres;
grant all on all functions in schema private to service_role;
alter default privileges in schema private grant all on tables to postgres;
alter default privileges in schema private grant all on tables to service_role;
alter default privileges in schema private grant all on functions to postgres;
alter default privileges in schema private grant all on functions to service_role;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.churches (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.churches
  add column if not exists status text not null default 'active';

alter table public.churches
  add column if not exists updated_at timestamptz not null default now();

alter table public.churches enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'churches_slug_format'
  ) then
    alter table public.churches
      add constraint churches_slug_format
      check (
        slug = lower(slug)
        and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'churches_name_present'
  ) then
    alter table public.churches
      add constraint churches_name_present
      check (length(trim(name)) > 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'churches_status_known'
  ) then
    alter table public.churches
      add constraint churches_status_known
      check (status in ('active', 'suspended'));
  end if;
end
$$;

drop trigger if exists churches_set_updated_at on public.churches;
create trigger churches_set_updated_at
  before update on public.churches
  for each row
  execute function public.set_updated_at();

create table if not exists public.church_operators (
  user_id uuid not null references auth.users (id) on delete cascade,
  church_id uuid not null references public.churches (id) on delete cascade,
  role text not null default 'operator',
  created_at timestamptz not null default now(),
  primary key (user_id, church_id)
);

alter table public.church_operators enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'church_operators_role_known'
  ) then
    alter table public.church_operators
      add constraint church_operators_role_known
      check (role in ('operator', 'admin'));
  end if;
end
$$;

create index if not exists church_operators_church_id_idx
  on public.church_operators (church_id);

drop policy if exists "operators_read_own_membership" on public.church_operators;
create policy "operators_read_own_membership"
  on public.church_operators
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "operators_read_own_church" on public.churches;
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

-- Old drafts stored ciphertext in public. Do not keep secret material there.
drop table if exists public.church_secrets;

create table if not exists private.church_secrets (
  church_id uuid primary key references public.churches (id) on delete cascade,
  openai_secret_id uuid not null unique,
  key_last_four text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table private.church_secrets enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'church_secrets_key_last_four_len'
  ) then
    alter table private.church_secrets
      add constraint church_secrets_key_last_four_len
      check (key_last_four is null or length(key_last_four) = 4);
  end if;
end
$$;

drop trigger if exists church_secrets_set_updated_at on private.church_secrets;
create trigger church_secrets_set_updated_at
  before update on private.church_secrets
  for each row
  execute function public.set_updated_at();

create table if not exists public.translation_session_events (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  output_language text not null,
  duration_seconds integer,
  created_at timestamptz not null default now()
);

alter table public.translation_session_events
  add column if not exists duration_seconds integer;

alter table public.translation_session_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'translation_session_events_duration_non_negative'
  ) then
    alter table public.translation_session_events
      add constraint translation_session_events_duration_non_negative
      check (duration_seconds is null or duration_seconds >= 0);
  end if;
end
$$;

create index if not exists translation_session_events_church_created_idx
  on public.translation_session_events (church_id, created_at desc);

create index if not exists translation_session_events_user_created_idx
  on public.translation_session_events (user_id, created_at desc);

-- Server-only: read the church OpenAI key from Vault. Not granted to browser roles.
create or replace function public.church_openai_api_key(p_church_id uuid)
returns text
language plpgsql
security definer
set search_path = private, vault, public
as $$
declare
  secret_id uuid;
  api_key text;
begin
  select church_secrets.openai_secret_id
    into secret_id
  from private.church_secrets
  join public.churches on churches.id = church_secrets.church_id
  where church_secrets.church_id = p_church_id
    and churches.status = 'active';

  if secret_id is null then
    return null;
  end if;

  select decrypted_secrets.decrypted_secret
    into api_key
  from vault.decrypted_secrets
  where decrypted_secrets.id = secret_id;

  return api_key;
end;
$$;

revoke all on function public.church_openai_api_key(uuid) from public;
revoke all on function public.church_openai_api_key(uuid) from anon;
revoke all on function public.church_openai_api_key(uuid) from authenticated;
grant execute on function public.church_openai_api_key(uuid) to service_role;
