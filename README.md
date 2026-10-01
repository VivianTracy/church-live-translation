# Church Translation

Live Chinese and English translation for wireless headsets, with a phone listener page. One volunteer runs it. No interpreter is required.

Licensed under the [MIT License](./LICENSE).

## Sign in

Sunday starts here:

**[https://church-translation.vercel.app/login](https://church-translation.vercel.app/login)**

Use Chrome or Edge on the church computer. Sign in, then start translation. Phone listeners do not sign in. They scan the QR code on the operator page.

Day-of steps in Chinese and English: [church-setup/OPERATOR.md](./church-setup/OPERATOR.md)

## Vercel

Vercel production deploys the **`feature/public-church-login`** branch. That branch is the live site at [church-translation.vercel.app](https://church-translation.vercel.app).

## How a service runs

1. The volunteer signs in on the church computer.
2. Sermon audio goes in through a streaming feed or a microphone.
3. OpenAI `gpt-realtime-translate` speaks the other language.
4. The computer plays that audio into the transmitter, then to wireless headsets.
5. The same audio is sent to phones through Upstash Redis.

Phones open a permanent link such as `https://church-translation.vercel.app/listen`. They can use mobile data. They never see the OpenAI key.

| Setting | What to use |
|---|---|
| Direction | Auto, or lock Chinese → English / English → Chinese |
| Audio in | Streaming (ClearClick / X32, BlackHole, VB-Cable) or a microphone |
| Audio out | Headphone jack or USB dongle into the transmitter |
| Phones | QR code on the operator page |

**Auto** starts immediately, using the last direction or Chinese → English. It switches only after clear Chinese or English speech, so a short verse or “Amen” does not flip the headsets.

Firefox cannot send translated audio to a chosen speaker.

## Set up a church

One-time setup for login, Vercel, and Redis:

- [church-setup/README.md](./church-setup/README.md)
- [church-setup/SUPABASE.md](./church-setup/SUPABASE.md)

Local `npm run start` is for development, or for a computer that is not using church login yet.

## Local development

```bash
git clone https://github.com/VivianTracy/church-live-translation.git
cd church-live-translation
npm install
cp church-setup/env.example .env.local
```

Add the Supabase keys and this line to `.env.local`:

```env
NEXT_PUBLIC_AUDIENCE_URL=https://church-translation.vercel.app
```

Then run `npm run dev` and open [http://127.0.0.1:3000/login](http://127.0.0.1:3000/login). `npm run dev` does not open the browser.

| Variable | Where | Required for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel and local | Church sign-in |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel and local | Church sign-in |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel and local server | Vault key and session log |
| `NEXT_PUBLIC_AUDIENCE_URL` | Vercel and local | Permanent phone QR |
| `UPSTASH_REDIS_REST_URL` | Vercel | Phone audio |
| `UPSTASH_REDIS_REST_TOKEN` | Vercel | Phone audio |
| `OPENAI_API_KEY` | Local only, if Supabase is unset | Temporary local fallback |

Do not commit `.env.local`. Do not put `OPENAI_API_KEY` on Vercel.

## Cost

`gpt-realtime-translate` is about **$0.034 per minute** of streamed audio ([pricing](https://developers.openai.com/api/docs/models/gpt-realtime-translate)). Phone listening uses a little Vercel and Upstash traffic. It does not start a second OpenAI session.

| Duration | Estimated OpenAI cost |
|---|---|
| 5-minute test | ~$0.17 |
| 45-minute session | ~$1.50 |
| 60-minute session | ~$2.00 |

## Design principles

- Fit the church’s existing mixer and streaming setup.
- One volunteer, one Start translation button.
- Reliability over cleverness. Optimize for Sunday morning.
