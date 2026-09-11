-- New churches are usable as soon as they register. No review step.

update public.churches
set status = 'active'
where status = 'pending';

drop table if exists public.church_verifications;

drop function if exists public.register_church(uuid, text, text, text, text, text, text);

create or replace function public.register_church(
  p_user_id uuid,
  p_name text,
  p_slug text,
  p_openai_api_key text,
  p_key_last_four text
)
returns uuid
language plpgsql
security definer
set search_path = private, vault, public
as $$
declare
  new_church_id uuid;
  secret_id uuid;
begin
  if p_user_id is null
    or length(trim(p_name)) = 0
    or length(trim(p_slug)) = 0
    or length(trim(p_openai_api_key)) = 0
    or length(p_key_last_four) <> 4
  then
    raise exception 'invalid_register_input';
  end if;

  if exists (
    select 1 from public.church_operators
    where church_operators.user_id = p_user_id
  ) then
    raise exception 'already_operator';
  end if;

  if exists (
    select 1 from public.churches
    where churches.slug = p_slug
  ) then
    raise exception 'slug_taken';
  end if;

  insert into public.churches (slug, name, status)
  values (p_slug, trim(p_name), 'active')
  returning id into new_church_id;

  insert into public.church_operators (user_id, church_id, role)
  values (p_user_id, new_church_id, 'admin');

  select vault.create_secret(
    p_openai_api_key,
    'openai-key-' || p_slug,
    'OpenAI API key for church translation'
  )
  into secret_id;

  insert into private.church_secrets (
    church_id,
    openai_secret_id,
    key_last_four,
    verified_at
  )
  values (
    new_church_id,
    secret_id,
    p_key_last_four,
    now()
  );

  return new_church_id;
end;
$$;

revoke all on function public.register_church(uuid, text, text, text, text) from public;
revoke all on function public.register_church(uuid, text, text, text, text) from anon;
revoke all on function public.register_church(uuid, text, text, text, text) from authenticated;
grant execute on function public.register_church(uuid, text, text, text, text) to service_role;
