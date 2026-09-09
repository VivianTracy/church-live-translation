# Church Translation

Live speech-to-speech translation for wireless headsets (for example Retekess TT125).

> Making bilingual worship accessible without requiring a dedicated interpreter.

This software is licensed under the [MIT License](./LICENSE).

## How it works

One volunteer runs the operator page on the church computer in **Chrome or Edge**. Firefox cannot send translated audio to a chosen speaker.

```text
Streaming audio or mic → Chrome (/operator-live)
                              ↓
                    gpt-realtime-translate
                              ↓
        PC audio out → TT125-TX → wireless headsets
```

| Setting | What to use |
|---|---|
| Translation | OpenAI `gpt-realtime-translate` |
| Direction | Auto, or lock Chinese → English / English → Chinese |
| Audio in | Streaming (ClearClick / X32, BlackHole, VB-Cable) or a microphone |
| Audio out | Headphone jack or USB dongle into the TT125-TX **MIC** port |

**Auto** starts translating immediately (last used direction, or Chinese → English). It only changes direction after clear Chinese or English speech, so a short Bible verse or “Amen” does not flip the headsets.

`http://localhost:3000/` opens `/operator-live`. The local server listens on `127.0.0.1` only.

Church computer install: [`church-setup/README.md`](./church-setup/README.md)

## Sunday / 主日

Daily operator steps (Chinese and English), including how to open Terminal or Command Prompt:

**[`church-setup/OPERATOR.md`](./church-setup/OPERATOR.md)**

## Local development

```bash
git clone https://github.com/VivianTracy/church-live-translation.git
cd church-live-translation
npm install
cp church-setup/env.example .env.local   # add OPENAI_API_KEY
npm run dev
```

Open **http://localhost:3000/operator-live** in Chrome or Edge. `npm run dev` does not open the browser.

| Variable | Required for |
|---|---|
| `OPENAI_API_KEY` | Translation |

Do not commit `.env.local`.

## Cost estimate

`gpt-realtime-translate` is about **$0.034 per minute** of streamed audio ([pricing](https://developers.openai.com/api/docs/models/gpt-realtime-translate)).

| Duration | Estimated cost |
|---|---|
| 5-minute test | ~$0.17 |
| 45-minute session | ~$1.50 |
| 60-minute session | ~$2.00 |

## Design principles

- Fit existing church AV. Do not replace OBS or the mixer.
- One volunteer, one Start translation button.
- Reliability over cleverness. Optimize for Sunday morning.
