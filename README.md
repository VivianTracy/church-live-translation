# Church Caption

## Mission

> **Making bilingual worship accessible without requiring a dedicated interpreter.**

Church Caption helps churches bridge language barriers during live events — wireless headset translation, YouTube captions, or both — while fitting into existing AV workflows.

---

## Current focus — live audio translation

**Production operator:** [`/operator-live`](http://localhost:3000/operator-live) — **Church Translation**

Runs on the church computer in Chrome or Edge. Live speech is translated to audio and routed to wireless receivers (e.g. Retekess TT125) via a 3.5 mm cable from the PC audio out.

| Capability | Details |
|---|---|
| Translation | `gpt-realtime-translate` — speech-to-speech, bidirectional |
| Directions | Chinese → English or English → Chinese |
| Audio in | OBS stream (BlackHole / VB-Cable) or physical microphone |
| Audio out | Any Windows/Mac playback device (`setSinkId`) — monitor jack, USB dongle, line out |
| Device detection | Input and output devices listed automatically after mic permission |
| Operator workflow | Direction → audio in/out → go live → start audio input |

**Setup:** [`church-setup/README.md`](./church-setup/README.md) — Windows/Mac install, VB-Cable, OBS monitoring, troubleshooting

```text
OBS / mic → Chrome (/operator-live)
                  ↓
        gpt-realtime-translate (WebRTC)
                  ↓
        translated audio → PC audio out → TT125-TX → wireless headsets
```

---

## Also available — YouTube caption overlay

Earlier work on **`main`** focused on **English captions on the YouTube stream** through OBS. That path remains production-ready and shares the same repo.

**Operator:** [`/operator-caption`](http://localhost:3000/operator-caption)

| Capability | Details |
|---|---|
| Speech-to-text | `gpt-4o-mini-transcribe` (5-second REST audio chunks) |
| Translation | `gpt-4o-mini` (Chinese text → English captions) |
| OBS overlay | [`/overlay`](http://localhost:3000/overlay) — Browser Source at 1920×1080 |
| Sermon transcripts | Auto-saved to `transcripts/<session-id>/` in Sermon mode |
| Caption modes | **Sermon** (captions + files), **Others** (prayer/announcements) |
| Overlay styling | [`/caption-settings`](http://localhost:3000/caption-settings) |

**Sunday checklist (captions):** [`church-setup/README-SUNDAY.md`](./church-setup/README-SUNDAY.md)

```text
BlackHole / VB-Cable → Chrome (/operator-caption)
                              ↓
                    gpt-4o-mini-transcribe (Chinese)
                              ↓
                    gpt-4o-mini (English captions)
                              ↓
                    caption state (Redis or local)
                              ↓
                    /overlay → OBS → YouTube
```

---

## Pages

| URL | Role |
|---|---|
| `/operator-live` | **Live audio translation** to wireless headsets |
| `/operator-caption` | YouTube caption operator + sermon transcripts |
| `/overlay` | OBS Browser Source (stream captions) |
| `/caption-settings` | Overlay font, position, alignment |
| `/operator` | Backup Gemini + manuscript operator (legacy) |

---

## Quick start

```bash
git clone https://github.com/VivianTracy/church-caption.git
cd church-caption
npm install
cp church-setup/env.example .env.local   # add OPENAI_API_KEY
npm run dev
```

Open **http://localhost:3000/operator-live** in Chrome or Edge.

**Windows church PC:** see [`church-setup/README.md`](./church-setup/README.md) for clone, install script, VB-Cable, and device setup.

**Required env var for both live translation and captions:**

| Variable | Required for |
|---|---|
| `OPENAI_API_KEY` | `/operator-live` and `/operator-caption` |
| `GEMINI_API_KEY` | `/operator` only (legacy backup path) |
| Redis / KV vars | Caption overlay sharing (optional — use `CAPTION_STORAGE=local` on one PC) |

---

## Cost estimate (OpenAI API)

Production uses **pay-as-you-go** API billing (not ChatGPT Plus). Confirm spend at [platform.openai.com/usage](https://platform.openai.com/usage) after a rehearsal.

### Live audio translation — `gpt-realtime-translate` (`/operator-live`)

Billed by **minutes of audio streamed** while the session is active ([pricing](https://developers.openai.com/api/docs/models/gpt-realtime-translate)).

| List price | |
|---|---|
| **$0.034 / minute** | Speech-to-speech translation (Chinese ↔ English) |

**Rough estimates** (active translation time; stop the session during long breaks to save cost):

| Duration | Estimated API cost |
|---|---|
| 5-minute test | ~$0.17 |
| 45-minute session | ~$1.50 |
| 60-minute session | ~$2.00 |

### YouTube captions — `gpt-4o-mini-transcribe` + `gpt-4o-mini` (`/operator-caption`)

| Model | Role | List price (Standard API) |
|---|---|---|
| `gpt-4o-mini-transcribe` | Chinese speech → text | $1.25 / 1M audio input tokens + $5.00 / 1M text output tokens |
| `gpt-4o-mini` | Chinese text → English captions | $0.15 / 1M input tokens + $0.60 / 1M output tokens |

| Duration | Estimated API cost |
|---|---|
| 5-minute test | ~$0.02–0.04 |
| 45-minute sermon | ~$0.15–0.25 |

Caption costs are lower because the pipeline transcribes and translates text in chunks; live translation streams audio continuously through the Realtime API.

---

## Design principles

- Integrate into existing church AV workflows.
- Keep the operator workflow simple — one volunteer, few steps.
- Reliability over cleverness; optimize for live events, not demos.
- Preserve biblical accuracy in translation and captions.
- Build incrementally and validate with real services.

---

## Technology stack

- Next.js, React, TypeScript, Tailwind CSS
- **OpenAI Realtime API** — live speech translation (`gpt-realtime-translate`)
- **OpenAI REST** — caption transcribe + translate (`gpt-4o-mini-transcribe`, `gpt-4o-mini`)
- **OBS** — Browser Source overlay for YouTube captions
- **Upstash Redis / Vercel KV** — caption state (optional locally via `CAPTION_STORAGE=local`)

---

## Past efforts and branches

| Effort | Status |
|---|---|
| Gemini + sermon manuscript operator (`/operator`) | Backup / reference — `preserve/gemini-manuscript-operator` |
| OpenAI Realtime Whisper + GPT Realtime captions | Research — see [`docs/WHISPER_GPT_REALTIME.md`](./docs/WHISPER_GPT_REALTIME.md) |
| Phone audience relay + QR listen page | Parked on `feature/zoom-audio-output` |
| Zoom dual-routing (transmitter + meeting) | Experimental — `feature/zoom-audio-output` |

For full architecture detail, see [`ARCHITECTURE.md`](./ARCHITECTURE.md).

**Additional docs:**

- [`church-setup/`](./church-setup/) — install, OBS, Windows troubleshooting
- [`docs/COLLABORATOR_SETUP.md`](./docs/COLLABORATOR_SETUP.md) — clone, env, dev workflow
- [`docs/WHISPER_GPT_REALTIME.md`](./docs/WHISPER_GPT_REALTIME.md) — Realtime API billing notes

---

## Long-term vision

Church Caption is a church translation platform — live audio, stream captions, and future tools (scripture display, sermon archive, multi-language) — designed to help churches communicate across language barriers using technology they already have.
