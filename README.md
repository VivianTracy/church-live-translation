# Church Translation

## Mission

> **Making bilingual worship accessible without requiring a dedicated interpreter.**

Live speech is translated to audio and routed to wireless receivers (e.g. Retekess TT125).

---

## Operator

**[`/operator-live`](http://localhost:3000/operator-live)** — Church Translation

Runs on the church computer in Chrome or Edge.

| Capability | Details |
|---|---|
| Translation | `gpt-realtime-translate` — speech-to-speech |
| Directions | Auto-detect Chinese or English, or lock Chinese → English / English → Chinese |
| Audio in | OBS stream (BlackHole / VB-Cable) or physical microphone |
| Audio out | Monitor jack, USB dongle, or line out to the TT125 transmitter |

```text
OBS / mic → Chrome (/operator-live)
                  ↓
        gpt-realtime-translate (WebRTC)
                  ↓
        translated audio → PC audio out → TT125-TX → wireless headsets
```

**Setup:** [`church-setup/README.md`](./church-setup/README.md)

---

## Quick start

```bash
git clone https://github.com/VivianTracy/church-live-translation.git
cd church-live-translation
npm install
cp church-setup/env.example .env.local   # add OPENAI_API_KEY
npm run dev
```

Open **http://localhost:3000/operator-live** in Chrome or Edge.

| Variable | Required for |
|---|---|
| `OPENAI_API_KEY` | `/operator-live` |

---

## Cost estimate (OpenAI API)

`gpt-realtime-translate` is billed by minutes of audio streamed ([pricing](https://developers.openai.com/api/docs/models/gpt-realtime-translate)).

| Duration | Estimated API cost |
|---|---|
| 5-minute test | ~$0.17 |
| 45-minute session | ~$1.50 |
| 60-minute session | ~$2.00 |

Stop the session during long breaks to save cost.

---

## Design principles

- Integrate into existing church AV workflows.
- Keep the operator workflow simple — one volunteer, few steps.
- Reliability over cleverness; optimize for live events, not demos.
