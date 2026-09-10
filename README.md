# Church Translation

Live speech-to-speech translation for wireless headsets (for example Retekess TT125), with an optional phone listener page.

> Making bilingual worship accessible without requiring a dedicated interpreter.

This software is licensed under the [MIT License](./LICENSE).

## How it works

One volunteer runs the operator page on the church computer in **Chrome or Edge**. Firefox cannot send translated audio to a chosen speaker.

```text
Streaming audio or mic → Chrome (/operator-live) on the church computer
                              ↓
                    gpt-realtime-translate
                              ↓
        PC audio out → TT125-TX → wireless headsets

                              ↓  WAV chunks (through the local /api, then Vercel)
                    Upstash Redis
                              ↓
        Phones scan a permanent QR → https://church-caption.vercel.app/listen
```

Headsets stay on the church computer. They do not need Vercel.

Phones open the deployed `/listen` page. They can use mobile data. They do not need church Wi‑Fi, and they never see the OpenAI key.

The operator browser talks only to `http://127.0.0.1:3000`. The local app forwards phone-audio requests to Vercel, so the church computer does not hit a browser “Failed to fetch” / CORS error.

| Setting | What to use |
|---|---|
| Translation | OpenAI `gpt-realtime-translate` on the church computer |
| Direction | Auto, or lock Chinese → English / English → Chinese |
| Audio in | Streaming (ClearClick / X32, BlackHole, VB-Cable) or a microphone |
| Audio out | Headphone jack or USB dongle into the TT125-TX **MIC** port |
| Phones | Permanent QR to `/listen` on the Vercel site |

**Auto** starts translating immediately (last used direction, or Chinese → English). It only changes direction after clear Chinese or English speech, so a short Bible verse or “Amen” does not flip the headsets.

`http://localhost:3000/` opens `/operator-live`. The local server listens on `127.0.0.1` only, so the OpenAI session API is not on church Wi‑Fi.

Church computer install, Vercel, and Redis: [`church-setup/README.md`](./church-setup/README.md)

## Sunday / 主日

Daily operator steps (Chinese and English), including how to open Terminal or Command Prompt:

**[`church-setup/OPERATOR.md`](./church-setup/OPERATOR.md)**

## Local development

```bash
git clone https://github.com/VivianTracy/church-live-translation.git
cd church-live-translation
npm install
cp church-setup/env.example .env.local
# add OPENAI_API_KEY
# add NEXT_PUBLIC_AUDIENCE_URL=https://church-caption.vercel.app
npm run dev
```

Open **http://127.0.0.1:3000/operator-live** in Chrome or Edge. `npm run dev` does not open the browser.

| Variable | Where | Required for |
|---|---|---|
| `OPENAI_API_KEY` | Church computer `.env.local` | Headset translation |
| `NEXT_PUBLIC_AUDIENCE_URL` | Church computer and Vercel | Permanent phone QR |
| `UPSTASH_REDIS_REST_URL` | Vercel only | Phone audio relay |
| `UPSTASH_REDIS_REST_TOKEN` | Vercel only | Phone audio relay |

Do not commit `.env.local`. Do not put `OPENAI_API_KEY` on Vercel.

Until phone listening is merged to `main`, deploy the Vercel Production branch from `feature/browser-listener`.

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
