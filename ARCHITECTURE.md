# Church Caption Architecture

## Mission

Church Caption exists to make bilingual worship accessible without requiring a dedicated interpreter.

The system should reduce the burden on translation coworkers while fitting naturally into the church's existing AV and livestream workflow.

---

## System Overview

One volunteer runs an **operator page**. The **congregation** reads English captions on **`/live`**. All operators publish to the same **Redis caption state**.

```text
Operator (mic)  →  STT  →  translate  →  Redis  →  /live (phones)
```

Two operator implementations coexist. Only one should run per service.

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
| `/api/caption-state` | `GET` | `/live` polls every second |

Redis key: `caption-state`. The browser never accesses Redis or AI keys directly.

---

## Operator Path A: Gemini (Production)

**URL:** `/operator`  
**Hook:** `lib/useGeminiLiveOperator.ts`

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
        ↓
Redis
```

### Gemini-specific features

- **Sermon Context** — full Chinese manuscript stored in Redis improves translation accuracy and consistency (`/api/service-context`, `SermonContextCard` on `/operator`).
- **Sentence pipeline** — `lib/sentenceCaptionPipeline.ts` batches ~2 sentences and refines interim text before translation.
- **Live / REST fallback** — tries Gemini Live first; falls back to REST when Live is unavailable or when manuscript context requires REST.

### Related pages

| Page | Purpose |
|---|---|
| `/operator` | Main production console |
| `/operator?test=1` | AV replay test (BlackHole / OBS) |
| `/operator-rest` | Gemini REST only (simpler) |
| `/operator-live` | Redirects to `/operator` |

### API routes

```text
POST /api/translate          → Gemini + church translation policy + optional manuscript
GET/POST /api/service-context → sermon manuscript in Redis
GET /api/live/token          → Gemini Live session token
```

---

## Operator Path B: OpenAI (Experimental)

**URL:** `/operator-openai`  
**Hook:** `lib/useOpenAIOperator.ts`

```text
Mic (echo cancellation OFF for BlackHole)
        ↓
5-second PCM chunks → WAV
        ↓
POST /api/openai/transcribe-audio
        ↓
gpt-4o-mini-transcribe (Chinese)
        ↓
POST /api/openai/translate
        ↓
gpt-4o-mini (Chinese → English)
        ↓
Append segments → POST /api/caption-state → Redis
```

### OpenAI design choices

- **No sermon manuscript** — translation receives only spoken Chinese from each chunk plus a fixed system prompt (Bible names, church terms). See `lib/openaiSermonTranslationPrompt.ts`.
- **REST chunk STT** — more reliable than Realtime Whisper manual commits for continuous sermon audio.
- **Segment queue** — each transcribed chunk is translated and appended to the full English caption stored in Redis.
- **Transcription monitor** — `WhisperStatusCard` shows PCM levels, API calls, and empty segments for debugging.

### Related pages

| Page | Purpose |
|---|---|
| `/operator-openai` | Experimental operator |
| `/operator-openai?test=1` | AV replay test |

### API routes

```text
POST /api/openai/transcribe-audio  → OpenAI audio/transcriptions (WAV chunks)
POST /api/openai/translate         → GPT-4o mini chat completion
POST /api/openai/transcription-session → legacy Realtime session (unused by current client)
```

**Requires:** `OPENAI_API_KEY`  
**Setup:** [`docs/WHISPER_GPT_REALTIME.md`](./docs/WHISPER_GPT_REALTIME.md)

---

## Audience Display: `/live`

**File:** `app/live/page.tsx`  
**Component:** `components/RollingCaptionDisplay.tsx`  
**Logic:** `lib/captionParagraph.ts`

The audience does **not** see the full sermon transcript scrolling on screen.

```text
GET /api/caption-state (poll 1s)
        ↓
RollingCaptionDisplay
        ↓
Show ONE paragraph at a time
        ↓
New paragraph after ~2.5s pause (updatedAt gap)
        ↓
Auto font size (fits phone viewport)
```

Full caption text is still stored in Redis for the operator; the audience view shows only the current speaking paragraph.

---

## Application Layers

### 1. UI

```text
app/operator/page.tsx
app/operator-openai/page.tsx
app/live/page.tsx
components/*
```

Pages do not call Gemini, OpenAI, or Redis directly.

### 2. Client helpers

```text
lib/translation.ts           → Gemini translate (production)
lib/openaiTranslate.ts       → OpenAI translate (experimental)
lib/openaiTranscribeAudio.ts → OpenAI STT chunks
lib/captionApi.ts            → save/load caption state
lib/serviceContextApi.ts     → sermon manuscript (Gemini path)
```

### 3. API routes (server-only keys)

```text
app/api/translate/route.ts
app/api/caption-state/route.ts
app/api/service-context/route.ts
app/api/openai/transcribe-audio/route.ts
app/api/openai/translate/route.ts
```

### 4. Policy and config

```text
lib/translationPrompt.ts           → Gemini church caption rules
lib/openaiSermonTranslationPrompt.ts → OpenAI caption rules (no manuscript body)
lib/service.ts                     → church name, service metadata
lib/redis.ts                       → Redis client
types/caption.ts                   → CaptionState type
```

---

## AV Workflow (Sunday Target)

```text
Behringer X32 → Main L/R → X-USB → Streaming PC
                                        ↓
                                      OBS
                                        ↓
                              BlackHole (virtual mic)
                                        ↓
                              Chrome → Operator page
                                        ↓
                              Redis → /live (phones)
```

Church Caption does not replace OBS or the mixer. It consumes the same audio feed the streaming computer already has.

**Local testing without live service:**

```text
OBS media → BlackHole → Chrome mic → /operator?test=1
                                  or /operator-openai?test=1
```

See `lib/avReplayTest.ts` and `public/test-audio/` for the replay clip.

---

## Environment Variables

| Variable | Used by |
|---|---|
| `GEMINI_API_KEY` | `/api/translate`, Live token |
| `OPENAI_API_KEY` | OpenAI transcribe + translate routes |
| Redis / KV vars | Caption state, service context |

---

## Branch Strategy

### `main`

Deployable branch. Contains Gemini production operator, OpenAI experimental operator, and rolling `/live` display.

### `preserve/gemini-manuscript-operator`

Frozen snapshot of the pre-OpenAI architecture (Gemini + manuscript only). Use as reference or for Gemini-only development without OpenAI code paths.

### `research/audio-first`

Longer-term experiments (audio-first translation, OBS overlay, multi-speaker). May break; not for Sunday use.

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

The first output is live captions. The larger mission is bilingual worship accessibility.
