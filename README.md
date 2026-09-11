# Church Translation

Live speech-to-speech translation for wireless headsets (for example Retekess TT125), with an optional phone listener page.

> Making bilingual worship accessible without requiring a dedicated interpreter.

This software is licensed under the [MIT License](./LICENSE).

## How it works

One volunteer opens the operator page in **Chrome or Edge** and signs in. Firefox cannot send translated audio to a chosen speaker.

```text
Streaming audio or mic → Chrome (/operator-live) on the church computer
                              ↓  church sign-in
                    temporary Realtime credential
                              ↓
                    gpt-realtime-translate
                              ↓
        PC audio out → transmitter → wireless headsets

                              ↓  WAV chunks
                    Upstash Redis
                              ↓
        Phones scan a permanent QR → https://church-translation.vercel.app/listen
```

The public operator page is on Vercel. The volunteer signs in. The server finds that church, checks the operator, decrypts the church OpenAI key, and returns only a short-lived credential.

Phones open `/listen`. They do not sign in. They can use mobile data. They never see the OpenAI key.

| Setting | What to use |
|---|---|
| Translation | OpenAI `gpt-realtime-translate` on the church computer |
| Direction | Auto, or lock Chinese → English / English → Chinese |
| Audio in | Streaming (ClearClick / X32, BlackHole, VB-Cable) or a microphone |
| Audio out | Headphone jack or USB dongle into the TT125-TX **MIC** port |
| Phones | Permanent QR to `/listen` on the Vercel site |

**Auto** starts translating immediately (last used direction, or Chinese → English). It only changes direction after clear Chinese or English speech, so a short Bible verse or “Amen” does not flip the headsets.

Sunday operators open the Vercel site, sign in, and start translation. Local `npm run start` is for development or a church computer that is not using church login yet.

Church login, Vercel, and Redis: [`church-setup/README.md`](./church-setup/README.md) and [`church-setup/SUPABASE.md`](./church-setup/SUPABASE.md)

## Sunday / 主日

Daily operator steps (Chinese and English), including how to open Terminal or Command Prompt:

**[`church-setup/OPERATOR.md`](./church-setup/OPERATOR.md)**

## Local development

```bash
git clone https://github.com/VivianTracy/church-live-translation.git
cd church-live-translation
npm install
cp church-setup/env.example .env.local
# add Supabase keys
# add NEXT_PUBLIC_AUDIENCE_URL=https://church-translation.vercel.app
npm run dev
```

Open **http://127.0.0.1:3000/login** in Chrome or Edge, then sign in. `npm run dev` does not open the browser.

| Variable | Where | Required for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel and local | Church sign-in |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel and local | Church sign-in |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel and local server | Vault key + session log |
| `NEXT_PUBLIC_AUDIENCE_URL` | Vercel and local | Permanent phone QR |
| `UPSTASH_REDIS_REST_URL` | Vercel | Phone audio relay |
| `UPSTASH_REDIS_REST_TOKEN` | Vercel | Phone audio relay |
| `OPENAI_API_KEY` | Local only, if Supabase is unset | Temporary local fallback |

Do not commit `.env.local`. Do not put `OPENAI_API_KEY` on Vercel.

Until this work is merged to `main`, deploy the Vercel Production branch from `feature/public-church-login`.

## Cost estimate

`gpt-realtime-translate` is about **$0.034 per minute** of streamed audio ([pricing](https://developers.openai.com/api/docs/models/gpt-realtime-translate)). Phone listening uses a small amount of Vercel and Upstash traffic. It does not start a second OpenAI session.

| Duration | Estimated OpenAI cost |
|---|---|
| 5-minute test | ~$0.17 |
| 45-minute session | ~$1.50 |
| 60-minute session | ~$2.00 |

## Design principles

- Fit existing church AV. Do not replace OBS or the mixer.
- One volunteer, one Start translation button.
- Reliability over cleverness. Optimize for Sunday morning.
