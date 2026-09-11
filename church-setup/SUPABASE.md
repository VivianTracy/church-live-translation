# Church login (Supabase)

One-time setup. Sunday operators only sign in. They do not edit these tables.

The OpenAI key is stored in **Supabase Vault**. Public tables keep only church and operator rows. Secret metadata lives in the `private` schema. The session API reads the key on the server, mints a short-lived Realtime credential, then records the request. The browser never sees the key.

## 1. Create a Supabase project

1. Sign in at [https://supabase.com](https://supabase.com).
2. Create a project for this church app.
3. Open **Authentication** → **Providers** and keep **Email** enabled.
4. Turn **off** public sign-ups. Invite operators yourself.

## 2. Run the migration

In **SQL Editor**, open and run the full contents of:

[`supabase/migrations/20260911000000_church_login_private_secrets.sql`](../supabase/migrations/20260911000000_church_login_private_secrets.sql)

Copy the SQL from that file. Do not type the file path into the editor.

If you already ran an older `schema.sql` that created `public.church_secrets`, this migration drops that public table. Store the key in Vault next.

## 3. Environment values

From **Project Settings** → **API**, copy:

| Name | Where it goes |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` on Vercel and in `.env.local` |
| `anon` `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` key | `SUPABASE_SERVICE_ROLE_KEY` (server only) |

Do not put `OPENAI_API_KEY` on Vercel. Do not put a church encryption secret in the app env. Vault holds the key.

## 4. Add a church and operator

1. In Supabase **Authentication** → **Users**, invite or create the operator email.
2. Copy the user’s UUID.
3. In **SQL Editor**, insert the church and membership (change the names):

```sql
insert into public.churches (slug, name)
values ('example-church', 'Example Church')
returning id;

insert into public.church_operators (user_id, church_id, role)
values (
  'OPERATOR_USER_UUID',
  'CHURCH_UUID',
  'operator'
);
```

## 5. Store the OpenAI key in Vault

In **SQL Editor**, replace the key, church id, and last four characters:

```sql
with created as (
  select vault.create_secret(
    'sk-your-openai-key',
    'openai-key-example-church',
    'OpenAI API key for church translation'
  ) as openai_secret_id
)
insert into private.church_secrets (
  church_id,
  openai_secret_id,
  key_last_four
)
select
  'CHURCH_UUID',
  created.openai_secret_id,
  'xxxx'
from created;
```

`key_last_four` is only a hint for administrators (the last four characters of the key). It is not the key.

Do not store the raw `sk-` key in a public table. Do not put `OPENAI_API_KEY` on Vercel.

## 6. Vercel environment variables

Add these for **Production**:

| Name | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase `anon` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase `service_role` key |
| `NEXT_PUBLIC_AUDIENCE_URL` | `https://church-translate.vercel.app` |
| `UPSTASH_REDIS_REST_URL` | Phone audio |
| `UPSTASH_REDIS_REST_TOKEN` | Phone audio |

Redeploy without build cache after saving.

## Check

1. Open `https://church-translate.vercel.app/login`.
2. Sign in as the operator.
3. You should land on `/operator-live` and see the church name.
4. Each church has a public `/listen/{slug}` page. Phones do not sign in.
