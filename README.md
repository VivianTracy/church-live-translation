# Church Caption

## Mission

> **Making bilingual worship accessible without requiring a dedicated interpreter.**

Church Caption helps bilingual churches provide live English translation during worship services while fitting naturally into their existing AV and livestream workflow.

The goal is not to replace church volunteers, but to reduce the burden on translation coworkers and make worship more accessible for English-speaking attendees.

---

## Current Version

### Version 0.3 – Church Streaming Kit

Church Caption runs on the **streaming computer** with OBS. The operator captures Chinese sermon audio; English captions appear on the YouTube stream through an OBS Browser Source.

**Production operator:** [`/operator-openai`](http://localhost:3000/operator-openai)

| Capability | Details |
|---|---|
| Speech-to-text | `gpt-4o-mini-transcribe` (5-second REST audio chunks) |
| Translation | `gpt-4o-mini` (Chinese text → English captions) |
| OBS overlay | `/overlay` — Browser Source at 1920×1080 |
| Sermon transcripts | Auto-saved to `transcripts/<session-id>/` in Sermon mode |
| Caption modes | **Sermon** (captions + files), **Others** (prayer/announcements) |
| Local Sunday runtime | `npm run dev` on the streaming PC; see [`church-setup/`](./church-setup/) |

**Pages:**

| URL | Role |
|---|---|
| `/operator-openai` | Production operator console |
| `/overlay` | OBS Browser Source (YouTube stream captions) |

**Setup bundle:** [`church-setup/README-SUNDAY.md`](./church-setup/README-SUNDAY.md)

---

## Quick Start

```bash
npm install
npm run dev
```

Required environment variables (see [`docs/COLLABORATOR_SETUP.md`](./docs/COLLABORATOR_SETUP.md)):

| Variable | Required for |
|---|---|
| `OPENAI_API_KEY` | `/operator-openai` (transcription + translation) |
| Redis / KV vars | Caption state (optional on streaming PC — set `CAPTION_STORAGE=local`) |

Open **http://localhost:3000/operator-openai**, add **http://localhost:3000/overlay** as an OBS Browser Source, and start captions.

---

## Cost Estimate (OpenAI API)

Production uses **pay-as-you-go** OpenAI API billing (not ChatGPT Plus). Check [platform.openai.com/usage](https://platform.openai.com/usage) after a test run.

| Model | Role | List price (Standard API) |
|---|---|---|
| `gpt-4o-mini-transcribe` | Chinese speech → text | $1.25 / 1M audio input tokens + $5.00 / 1M text output tokens |
| `gpt-4o-mini` | Chinese text → English captions | $0.15 / 1M input tokens + $0.60 / 1M output tokens |

**Rough estimates for one service** (mic live during preaching; quiet pauses reduce cost):

| Duration | Estimated API cost |
|---|---|
| 5-minute test | ~$0.02–0.04 |
| 45-minute sermon | ~$0.15–0.25 |

Transcription is billed on audio processed; translation is billed per caption chunk (each ~5 seconds of speech triggers one transcribe + one translate call). Run a short rehearsal before Sunday and confirm on the usage dashboard.

---

## Design Principles

- Integrate into the existing church AV workflow.
- Do not require changes to the production audio system.
- Keep the operator workflow simple.
- Preserve biblical accuracy.
- Optimize for readable captions, not word-for-word translation.
- Support churches with or without volunteer interpreters.
- Build incrementally and validate with real worship services.

---

## Technology Stack

- Next.js, React, TypeScript, Tailwind CSS
- **OpenAI** — production STT + translation (`/operator-openai`)
- **Upstash Redis / Vercel KV** — caption state (optional locally via `CAPTION_STORAGE=local`)
- **OBS** — Browser Source overlay for YouTube stream

---

## Architecture Overview

```text
BlackHole / VB-Cable → Chrome (/operator-openai)
                              ↓
                    gpt-4o-mini-transcribe (Chinese)
                              ↓
                    gpt-4o-mini (English captions)
                              ↓
                    POST /api/caption-state
                              ↓
                    Redis or local storage
                              ↓
                    GET /api/caption-state (poll)
                              ↓
                    /overlay → OBS → YouTube
```

For full detail, see [`ARCHITECTURE.md`](./ARCHITECTURE.md).

**Additional docs:**

- [`church-setup/`](./church-setup/) — Sunday install and OBS setup
- [`docs/COLLABORATOR_SETUP.md`](./docs/COLLABORATOR_SETUP.md) — clone, env, dev workflow
- [`docs/WHISPER_GPT_REALTIME.md`](./docs/WHISPER_GPT_REALTIME.md) — OpenAI billing and API notes

---

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Deployable app: OpenAI production operator + OBS overlay |
| `preserve/gemini-manuscript-operator` | Snapshot of Gemini + manuscript operator (reference) |

---

## Long-Term Vision

Church Caption is a church translation platform — not just a caption app — designed to help churches communicate the Gospel across language barriers while fitting naturally into existing worship technology.
