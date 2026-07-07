# Church Caption

## Mission

> **Making bilingual worship accessible without requiring a dedicated interpreter.**

Church Caption helps bilingual churches provide live English translation during worship services while fitting naturally into their existing AV and livestream workflow.

The goal is not to replace church volunteers, but to reduce the burden on translation coworkers and make worship more accessible for English-speaking attendees.

---

## Current Version

### Version 0.2 – Cloud Beta

Church Caption supports **two operator paths** that publish captions to OBS overlay:

| Path | URL | Best for |
|---|---|---|
| **Production (Gemini)** | `/operator` | Sunday service with optional sermon manuscript |
| **Experimental (OpenAI)** | `/operator-openai` | OpenAI STT + translation, sermon transcripts, OBS kit |

Both paths publish caption state for **`/overlay`** (OBS Browser Source). YouTube viewers see English captions on the stream.

**Shared capabilities:**

- Caption state for OBS overlay (`/overlay`)
- Church-specific translation policy and Bible-aware terminology
- Operator console with microphone controls
- AV replay test mode (`?test=1`) for local validation

**Gemini path (`/operator`):**

- Chrome speech recognition
- Gemini Live or REST translation
- Optional sermon manuscript context (Redis)
- Sentence caption pipeline

**OpenAI path (`/operator-openai`):**

- REST chunk transcription (`gpt-4o-mini-transcribe`)
- GPT-4o mini translation from spoken Chinese only (no manuscript)
- Transcription monitor for debugging

---

## Quick Start

```bash
npm install
npm run dev
```

Required environment variables (see [`docs/COLLABORATOR_SETUP.md`](./docs/COLLABORATOR_SETUP.md)):

| Variable | Required for |
|---|---|
| `GEMINI_API_KEY` | `/operator` |
| `OPENAI_API_KEY` | `/operator-openai` |
| Redis / KV vars | Caption state + sermon context (optional on streaming PC — see `CAPTION_STORAGE=local`) |

**Pages:**

| URL | Role |
|---|---|
| `/operator` | Production operator (Gemini) |
| `/operator-openai` | Production operator (OpenAI) |
| `/overlay` | OBS Browser Source (YouTube stream captions) |

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
- **Google Gemini** — production translation (`/operator`)
- **OpenAI** — experimental STT + translation (`/operator-openai`)
- **Upstash Redis / Vercel KV** — shared caption state and sermon context
- **Chrome** — speech recognition (Gemini path)
- **Vercel** — deployment

---

## Architecture Overview

```text
                    ┌─────────────────────┐
                    │   /operator         │
                    │   Chrome STT        │
                    │   Gemini translate  │
                    │   (+ manuscript)    │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │  /operator-openai   │
                    │  OpenAI STT chunks    │
                    │  GPT-4o mini        │
                    │  (spoken text only)   │
                    └──────────┬──────────┘
                               │
                    POST /api/caption-state
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Redis or local    │
                    └──────────┬──────────┘
                               │
                    GET /api/caption-state (poll)
                               │
                               ▼
                    ┌─────────────────────┐
                    │   /overlay          │
                    │   OBS Browser Source│
                    │   YouTube stream    │
                    └─────────────────────┘
```

For full detail, see [`ARCHITECTURE.md`](./ARCHITECTURE.md).

**Additional docs:**

- [`docs/COLLABORATOR_SETUP.md`](./docs/COLLABORATOR_SETUP.md) — clone, env, dev workflow
- [`docs/WHISPER_GPT_REALTIME.md`](./docs/WHISPER_GPT_REALTIME.md) — OpenAI operator setup and billing

---

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Deployable app: Gemini production + OpenAI experimental |
| `preserve/gemini-manuscript-operator` | Snapshot of Gemini-only architecture before OpenAI merge (reference) |
| `research/audio-first` | Longer-term audio-first experiments |

---

## Roadmap

### Version 0.3 – First Church Workflow Integration

- Validate on the church streaming computer (X32 USB feed)
- OBS / BlackHole AV replay testing
- OBS browser-source overlay output
- Sunday worship validation

---

## Long-Term Vision

Church Caption is a church translation platform — not just a caption app — designed to help churches communicate the Gospel across language barriers while fitting naturally into existing worship technology.
