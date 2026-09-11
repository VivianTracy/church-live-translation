# Church login (Supabase)

One-time setup. Sunday operators only sign in. They do not edit these tables.

The OpenAI key is stored encrypted. The browser never sees it. The session API decrypts it on the server, mints a short-lived Realtime credential, then records the request.

## 1. Create a Supabase project

1. Sign in at [https://supabase.com](https://supabase.com).
2. Create a project for this church app.
3. Open **Authentication** → **Providers** and keep **Email** enabled.
4. Turn **off** public sign-ups. Invite operators yourself.

## 2. Run the schema

In **SQL Editor**, paste and run [`supabase/schema.sql`](../supabase/schema.sql).

## 3. Environment values

From **Project Settings** → **API**, copy:

| Name | Where it goes |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` on Vercel and in `.env.local` |
| `anon` `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` key | `SUPABASE_SERVICE_ROLE_KEY` (server only) |

Create an encryption secret (64 hex characters):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Put that value in `CHURCH_SECRET_ENCRYPTION_KEY` on Vercel and in `.env.local`. Do not commit it.

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

## 5. Store the encrypted OpenAI key

On a trusted computer that has `CHURCH_SECRET_ENCRYPTION_KEY` in the environment:

```bash
node scripts/encrypt-openai-key.mjs sk-your-openai-key
```

Paste the printed `v1:...` value into SQL:

```sql
insert into public.church_secrets (church_id, encrypted_openai_api_key)
values ('CHURCH_UUID', 'v1:...');
```

Do not store the raw `sk-` key in Supabase. Do not put `OPENAI_API_KEY` on Vercel.

## 6. Vercel environment variables

Add these for **Production**:

| Name | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key |
| `CHURCH_SECRET_ENCRYPTION_KEY` | 64-character hex secret |
| `NEXT_PUBLIC_AUDIENCE_URL` | `https://church-caption.vercel.app` |
| `UPSTASH_REDIS_REST_URL` | Phone audio |
| `UPSTASH_REDIS_REST_TOKEN` | Phone audio |

Redeploy without build cache after saving.

## Check

1. Open `https://church-caption.vercel.app/login`.
2. Sign in as the operator.
3. You should land on `/operator-live` and see the church name.
4. `/listen` stays public. Phones do not sign in.
