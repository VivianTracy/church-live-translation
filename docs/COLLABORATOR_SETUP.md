# Church Translation — Collaborator Setup

## Repo

https://github.com/VivianTracy/church-live-translation

## Local run

```bash
git clone https://github.com/VivianTracy/church-live-translation.git
cd church-live-translation
npm install
cp church-setup/env.example .env.local
```

Add the Supabase keys from `church-setup/SUPABASE.md`, then:

```bash
npm run dev
```

Open **http://localhost:3000/login** in Chrome or Edge and sign in as a church operator.

Do not commit `.env.local`. Do not put `OPENAI_API_KEY` on Vercel.
