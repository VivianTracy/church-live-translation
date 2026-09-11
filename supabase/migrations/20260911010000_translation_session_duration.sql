-- Record how long a translation session ran. Existing rows stay null.
-- Apply after 20260911000000_church_login_private_secrets.sql.

alter table public.translation_session_events
  add column if not exists duration_seconds integer;

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
