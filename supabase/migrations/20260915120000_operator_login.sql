-- One active operator login at a time, plus last translation activity for idle sign-out.
-- Apply after church login is already set up.

create table if not exists public.operator_logins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  login_id uuid not null,
  logged_in_at timestamptz not null default now(),
  last_translation_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.operator_logins enable row level security;

drop trigger if exists operator_logins_set_updated_at on public.operator_logins;
create trigger operator_logins_set_updated_at
  before update on public.operator_logins
  for each row
  execute function public.set_updated_at();

drop policy if exists "operators_read_own_login" on public.operator_logins;
create policy "operators_read_own_login"
  on public.operator_logins
  for select
  to authenticated
  using (user_id = auth.uid());
