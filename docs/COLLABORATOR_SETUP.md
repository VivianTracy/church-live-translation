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

Add `OPENAI_API_KEY` to `.env.local`, then:

```bash
npm run dev
```

Open **http://localhost:3000/operator-live** in Chrome or Edge.

Do not commit `.env.local`.
