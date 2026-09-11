# Church login (Supabase)

One-time setup. Sunday operators only sign in. They do not edit these tables.

The OpenAI key is stored in **Supabase Vault**. Public tables keep only church and operator rows. Secret metadata lives in the `private` schema. The session API reads the key on the server, mints a short-lived Realtime credential, then records the request. The browser never sees the key.

## 1. Create a Supabase project

1. Sign in at [https://supabase.com](https://supabase.com).
2. Create a project for this church app.
3. Open **Authentication** → **Providers** and keep **Email** enabled.
4. Keep **Allow new users to sign up** **off**. Churches register at `/register` in this app, not through the Supabase sign-up form.
5. Open **Authentication** → **URL Configuration**. Set Site URL to `https://church-translation.vercel.app`. Add Redirect URLs:
   - `https://church-translation.vercel.app/**`
   - `http://127.0.0.1:3000/**`
   Password reset emails open `/auth/callback`, then `/reset-password`.

## 2. Run the migration

In **SQL Editor**, open and run the full contents of:

[`supabase/migrations/20260911000000_church_login_private_secrets.sql`](../supabase/migrations/20260911000000_church_login_private_secrets.sql)

Copy the SQL from that file. Do not type the file path into the editor.

If church login is already set up, also run:

[`supabase/migrations/20260911010000_translation_session_duration.sql`](../supabase/migrations/20260911010000_translation_session_duration.sql)

[`supabase/migrations/20260911120000_register_church.sql`](../supabase/migrations/20260911120000_register_church.sql)

[`supabase/migrations/20260911130000_church_verification.sql`](../supabase/migrations/20260911130000_church_verification.sql)

[`supabase/migrations/20260911140000_register_church_verification.sql`](../supabase/migrations/20260911140000_register_church_verification.sql)

The duration file records how long translation ran. The register file lets a church create itself at `/register` without SQL. The verification files keep a new church pending until you confirm it.

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

New churches should open `/register` and fill in the church name, church brief name, operator email, password, and OpenAI key. Keep Supabase public sign-up **off**. After they register, you get a review email. Confirm the church on that page. They get an email when they can sign in. The listen page is `/listen/{brief-name}`.

SQL below is only a fallback if `/register` is not deployed yet.

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

`/register` and **This church** on the operator page do this for you. The SQL below is only a fallback.

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
| `NEXT_PUBLIC_AUDIENCE_URL` | `https://church-translation.vercel.app` |
| `UPSTASH_REDIS_REST_URL` | Phone audio |
| `UPSTASH_REDIS_REST_TOKEN` | Phone audio |
| `RESEND_API_KEY` | Review and “you can sign in” emails |
| `CHURCH_EMAIL_FROM` | Optional. Default is Resend’s test from-address |

Redeploy without build cache after saving.

## 7. Review email (Resend)

New churches stay **pending** until you confirm them.

1. Create a free account at [https://resend.com](https://resend.com) with `vivian.zke@gmail.com`.
2. Copy an API key into `RESEND_API_KEY` on Vercel and in `.env.local`.
3. Leave `CHURCH_REVIEW_EMAIL` unset unless you want reviews sent somewhere else. It defaults to `vivian.zke@gmail.com`.
4. After a church registers, open the confirm link in that email. Check the church name, brief name, operator email, and OpenAI key ending. Click **Confirm this church**.
5. The operator then gets an email that they can sign in.

Resend’s test from-address can email your Resend account address. To email other church operators, add and verify a domain in Resend, then set `CHURCH_EMAIL_FROM` to something like `Church Translation <noreply@your-domain>`. Confirming still works if that operator email cannot be sent; tell them they can sign in.

## Check

1. Open `/register` and create a church.
2. You should get a review email. Confirm the church. The operator should get an email, then sign in at `/login`.
3. Each confirmed church has a public `/listen/{slug}` page. Phones do not sign in.
4. Keep **Allow new users to sign up** off in Supabase. Registration is only `/register`.
