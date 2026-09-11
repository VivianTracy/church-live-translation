-- Self-serve church registration: one service-role RPC for church + operator + Vault.
-- Apply after 20260911000000_church_login_private_secrets.sql.

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

  insert into public.churches (slug, name)
  values (p_slug, trim(p_name))
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

create or replace function public.replace_church_openai_key(
  p_church_id uuid,
  p_openai_api_key text,
  p_key_last_four text
)
returns void
language plpgsql
security definer
set search_path = private, vault, public
as $$
declare
  secret_id uuid;
  church_slug text;
begin
  if p_church_id is null
    or length(trim(p_openai_api_key)) = 0
    or length(p_key_last_four) <> 4
  then
    raise exception 'invalid_key_input';
  end if;

  select churches.slug
    into church_slug
  from public.churches
  where churches.id = p_church_id
    and churches.status = 'active';

  if church_slug is null then
    raise exception 'unknown_church';
  end if;

  select church_secrets.openai_secret_id
    into secret_id
  from private.church_secrets
  where church_secrets.church_id = p_church_id;

  if secret_id is null then
    select vault.create_secret(
      p_openai_api_key,
      'openai-key-' || church_slug,
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
      p_church_id,
      secret_id,
      p_key_last_four,
      now()
    );
    return;
  end if;

  perform vault.update_secret(
    secret_id,
    p_openai_api_key,
    'openai-key-' || church_slug,
    'OpenAI API key for church translation'
  );

  update private.church_secrets
  set
    key_last_four = p_key_last_four,
    verified_at = now()
  where church_secrets.church_id = p_church_id;
end;
$$;

revoke all on function public.replace_church_openai_key(uuid, text, text) from public;
revoke all on function public.replace_church_openai_key(uuid, text, text) from anon;
revoke all on function public.replace_church_openai_key(uuid, text, text) from authenticated;
grant execute on function public.replace_church_openai_key(uuid, text, text) to service_role;

create or replace function public.church_openai_key_last_four(p_church_id uuid)
returns text
language plpgsql
security definer
set search_path = private, public
as $$
declare
  last_four text;
begin
  select church_secrets.key_last_four
    into last_four
  from private.church_secrets
  where church_secrets.church_id = p_church_id;

  return last_four;
end;
$$;

revoke all on function public.church_openai_key_last_four(uuid) from public;
revoke all on function public.church_openai_key_last_four(uuid) from anon;
revoke all on function public.church_openai_key_last_four(uuid) from authenticated;
grant execute on function public.church_openai_key_last_four(uuid) to service_role;

