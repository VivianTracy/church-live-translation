# Church Caption Architecture

## Mission

Church Caption exists to make bilingual worship accessible without requiring a dedicated interpreter.

The system should reduce the burden on translation coworkers while fitting naturally into the church's existing AV and livestream workflow.

---

## System Overview

One volunteer runs the **operator page** on the streaming computer. English captions appear on the **YouTube stream** through OBS **`/overlay`**. Caption state is shared via Redis or local in-memory storage on the streaming PC.

```text
Operator (mic)  →  STT  →  translate  →  caption state  →  /overlay (OBS → YouTube)
```

**Production path:** OpenAI (`/operator-caption`) — used for Sunday worship.

**Backup path:** Gemini with sermon manuscript (`/operator`) — available if OpenAI is unavailable or when manuscript-guided translation is preferred.

Only one operator path should run per service.

---

## Shared Hub: Caption State

All paths read and write the same shape:

```ts
export type CaptionState = {
  isLive: boolean;
  caption: string;
  updatedAt: number;
};
```

| Route | Method | Role |
|---|---|---|
| `/api/caption-state` | `POST` | Operator publishes caption + timestamp |
| `/api/caption-state` | `GET` | `/overlay` polls every 500ms |

Storage: Redis key `caption-state`, or in-memory when `CAPTION_STORAGE=local` (no Redis on streaming PC). The browser never accesses Redis or AI keys directly.

---

## Operator Path A: OpenAI (Production)

**URL:** `/operator-caption`  
**Hook:** `lib/useOpenAIOperator.ts`

```text
Mic (echo cancellation OFF for BlackHole / VB-Cable)
        ↓
5-second PCM chunks → WAV
        ↓
POST /api/openai/transcribe-audio
        ↓
gpt-4o-mini-transcribe → Chinese text
        ↓
POST /api/openai/translate
        ↓
gpt-4o-mini → English caption (same Chinese chunk as input)
        ↓
Append to caption state + sermon transcript files (Sermon mode)
        ↓
POST /api/caption-state
```

### Production design choices

- **Two-step pipeline** — transcribe output is passed directly to translation; no sermon manuscript on this path.
- **REST chunk STT** — 5-second WAV chunks via `/v1/audio/transcriptions`; quiet chunks skipped below RMS threshold.
- **Sermon session** — Sermon mode writes `chinese.txt`, `english.txt`, and `segments.jsonl` under `transcripts/<session-id>/`; files finalize when the operator ends the session.
- **Caption modes** — **Sermon** (overlay + transcript files), **Others** (overlay only, no files).
- **Transcription monitor** — `WhisperStatusCard` shows PCM levels, API calls, and empty segments for debugging.

### Related pages

| Page | Purpose |
|---|---|
| `/operator-caption` | Caption operator (YouTube + sermon transcripts) |
| `/operator-caption?test=1` | AV replay test (BlackHole / OBS) |
| `/operator-live` | Live output operator (earpiece audio, captions, or both) |

### API routes

```text
POST /api/openai/transcribe-audio  → gpt-4o-mini-transcribe (WAV chunks)
POST /api/openai/translate         → gpt-4o-mini chat completion
POST /api/sermon-session           → start / pause / resume / end transcript session
GET/POST /api/overlay-settings     → font size, position, alignment for /overlay
GET /api/storage-mode              → local vs Redis caption storage
```

**Requires:** `OPENAI_API_KEY`  
**Setup:** [`church-setup/`](./church-setup/) and [`docs/WHISPER_GPT_REALTIME.md`](./docs/WHISPER_GPT_REALTIME.md)

### Cost (OpenAI API, approximate)

| Model | List price (Standard) |
|---|---|
| `gpt-4o-mini-transcribe` | $1.25 / 1M audio input tokens + $5.00 / 1M text output tokens |
| `gpt-4o-mini` | $0.15 / 1M input tokens + $0.60 / 1M output tokens |

~$0.15–0.25 per 45-minute sermon; ~$0.02–0.04 for a 5-minute test. Confirm on [platform.openai.com/usage](https://platform.openai.com/usage).

---

## Operator Path B: Gemini + Manuscript (Backup)

**URL:** `/operator`  
**Hook:** `lib/useGeminiLiveOperator.ts`

Use this path when OpenAI is unavailable, or when uploading a Chinese sermon manuscript improves translation accuracy.

```text
Pastor speaks Chinese
        ↓
Chrome Speech Recognition
        ↓
Chinese text (interim + final)
        ↓
Sentence caption pipeline (batch / refine)
        ↓
Translation:
  • Gemini Live API (WebSocket) when available, OR
  • POST /api/translate (Gemini REST) as fallback
        ↓
Optional sermon manuscript (Redis service context)
        ↓
POST /api/caption-state
```

### Backup-path features

- **Sermon Context** — full Chinese manuscript in Redis improves translation (`/api/service-context`, `SermonContextCard` on `/operator`).
- **Sentence pipeline** — `lib/sentenceCaptionPipeline.ts` batches ~2 sentences before translation.
- **Live / REST fallback** — tries Gemini Live first; falls back to REST when Live is unavailable or manuscript context requires REST.

### Related pages

| Page | Purpose |
|---|---|
| `/operator` | Backup operator console |
| `/operator?test=1` | AV replay test |
| `/operator-rest` | Gemini REST only |
| `/operator-live` | Redirects to `/operator` |

### API routes

```text
POST /api/translate          → Gemini + church translation policy + optional manuscript
GET/POST /api/service-context → sermon manuscript in Redis
GET /api/live/token          → Gemini Live session token
```

**Requires:** `GEMINI_API_KEY`, Chrome, Redis for manuscript context

---

## OBS Overlay: `/overlay`

**File:** `app/overlay/page.tsx`  
**Component:** `components/RollingCaptionDisplay.tsx`

```text
GET /api/caption-state (poll ~500ms)
GET /api/overlay-settings
        ↓
RollingCaptionDisplay
        ↓
Transparent background for OBS Browser Source
        ↓
YouTube viewers see rolling English captions on stream
```

Overlay layout (font size, position, alignment) is controlled from `/caption-settings` via `/api/overlay-settings`.

Import starter scene: [`church-setup/obs/church-caption-scenes.json`](./church-setup/obs/church-caption-scenes.json)

---

## Application Layers

### 1. UI

```text
app/operator-caption/page.tsx   ← caption operator (YouTube + transcripts)
app/operator-live/page.tsx      ← live output (audio, captions, or both)
app/operator/page.tsx          ← backup
app/overlay/page.tsx
components/*
```

Pages do not call Gemini, OpenAI, or Redis directly.

### 2. Client helpers

```text
lib/useOpenAIOperator.ts     → production operator hook
lib/openaiTranslate.ts       → OpenAI translate
lib/openaiTranscribeAudio.ts → OpenAI STT chunks
lib/sermonSessionApi.ts      → transcript session lifecycle
lib/captionApi.ts            → save/load caption state
lib/translation.ts           → Gemini translate (backup)
lib/serviceContextApi.ts     → sermon manuscript (backup)
```

### 3. API routes (server-only keys)

```text
app/api/openai/transcribe-audio/route.ts
app/api/openai/translate/route.ts
app/api/sermon-session/route.ts
app/api/caption-state/route.ts
app/api/overlay-settings/route.ts
app/api/translate/route.ts           ← backup
app/api/service-context/route.ts     ← backup
```

### 4. Policy and config

```text
lib/openaiSermonTranslationPrompt.ts → OpenAI caption rules
lib/translationPrompt.ts             → Gemini caption rules (backup)
lib/sermonTranscriptStorage.ts       → local transcript files
lib/storageMode.ts                   → local vs Redis caption storage
lib/service.ts                       → church name, service metadata
types/caption.ts                     → CaptionState type
```

---

## AV Workflow (Sunday Target)

```text
Behringer X32 → Main L/R → X-USB → Streaming PC
                                        ↓
                                      OBS
                                        ↓
                              BlackHole / VB-Cable
                                        ↓
                              Chrome → /operator-caption
                                        ↓
                              caption state → /overlay → YouTube
```

Church Caption does not replace OBS or the mixer. It consumes the same audio feed the streaming computer already has.

**Local testing without live service:**

```text
OBS media → BlackHole → Chrome mic → /operator-caption?test=1
```

See `lib/avReplayTest.ts` and `public/test-audio/` for the replay clip.

---

## Environment Variables

| Variable | Used by |
|---|---|
| `OPENAI_API_KEY` | Production transcribe + translate |
| `GEMINI_API_KEY` | Backup `/operator` translate + Live token |
| Redis / KV vars | Caption state, overlay settings, manuscript (optional locally) |
| `CAPTION_STORAGE=local` | Skip Redis on streaming PC (overlay only) |
| `TRANSCRIPT_DIR` | Override default `./transcripts` folder |

---

## Branch Strategy

### `main`

Deployable branch. OpenAI production operator, OBS `/overlay`, sermon transcripts, and `church-setup/` bundle.

### `preserve/gemini-manuscript-operator`

Frozen snapshot of the Gemini + manuscript operator. Backup path reference.

### `research/audio-first`

Longer-term experiments. Not for Sunday use.

---

## Architectural Principles

- Keep `main` deployable.
- Protect API keys on the server only.
- Do not call Gemini or OpenAI directly from React components.
- Keep Redis access inside API routes.
- Keep UI independent from backend implementation.
- Avoid changing church production AV unless necessary.
- Validate in real worship services, not demos alone.

---

## Long-Term Vision

```text
Translation Engine
        ↓
Captions · AI voice · Transcript · Archive · Bible references
```

The first output is live captions on the YouTube stream. The larger mission is bilingual worship accessibility.
