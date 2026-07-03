# Church Caption Architecture

## Mission

Church Caption exists to make bilingual worship accessible without requiring a dedicated interpreter.

The system should reduce the burden on translation coworkers while fitting naturally into the church's existing AV and livestream workflow.

---

## Current Cloud Beta Architecture

```text
Pastor speaks Chinese
        ↓
Chrome Speech Recognition
        ↓
Operator Page
        ↓
translateChineseToEnglish()
        ↓
POST /api/translate
        ↓
Gemini + Church Translation Policy
        ↓
English caption
        ↓
POST /api/caption-state
        ↓
Redis shared caption state
        ↓
Live Page polls GET /api/caption-state
        ↓
Audience sees English caption
```

---

## Main Application Layers

### 1. UI Layer

```text
app/operator/page.tsx
app/live/page.tsx
components/*
```

Responsible for rendering the operator console and audience display.

The UI should not know whether captions are stored in Redis, Supabase, or another backend.

---

### 2. Client Helper Layer

```text
lib/translation.ts
lib/captionApi.ts
```

These files hide API calls from React pages.

The UI calls simple functions:

```ts
translateChineseToEnglish(...)
saveCaptionState(...)
loadCaptionState()
```

---

### 3. API Layer

```text
app/api/translate/route.ts
app/api/caption-state/route.ts
```

The browser never talks directly to Gemini or Redis.

API routes protect credentials and centralize backend behavior.

---

### 4. Service and Configuration Layer

```text
lib/translationPrompt.ts
lib/service.ts
lib/redis.ts
types/caption.ts
```

Responsibilities:

```text
translationPrompt.ts  → church translation policy
service.ts            → church and service metadata
redis.ts              → Redis client
caption.ts            → shared CaptionState type
```

---

## Caption State

Current shared state shape:

```ts
export type CaptionState = {
  isLive: boolean;
  caption: string;
  updatedAt: number;
};
```

This shape should remain stable unless there is a clear product reason to change it.

---

## Current AV Assumptions

Based on the archived X32 setup document, the church system appears to route Main L/R audio to the streaming computer through X-USB.

Current known flow:

```text
Behringer X32
        ↓
Main L/R
        ↓
Output 15/16
        ↓
User Out 1/2
        ↓
X-USB
        ↓
Streaming Computer
        ↓
OBS
```

Church Caption should initially consume the existing audio feed rather than requiring mixer routing changes.

---

## Target Church Integration Architecture

```text
Pastor / Worship Leader / Moderator
        ↓
Behringer X32
        ↓
USB Audio Feed
        ↓
Streaming Computer
        ↓
Church Caption
        ↓
Translation Engine
        ↓
Redis Caption State
        ↓
Outputs
```

Possible outputs:

```text
/live       → phones or personal devices
/overlay    → OBS Browser Source
/display    → large screen display
future      → transcript, AI voice, service archive
```

---

## OBS Integration Direction

The church uses OBS.

Future integration should prefer OBS Browser Source when possible.

Target flow:

```text
Church Caption /overlay
        ↓
OBS Browser Source
        ↓
Existing OBS Scene
        ↓
Projector or livestream output
```

Important principle:

Church Caption should not replace PowerPoint, OBS, or the existing AV workflow.

It should become one additional source in the existing system.

---

## Audio Strategy

### Version 0.3

Use the existing livestream audio feed.

This requires no mixer changes.

```text
Main L/R → X-USB → Streaming Computer → Chrome / Church Caption
```

### Future Enhancement

Support a dedicated translation audio mix when available.

```text
Pastor mic
Moderator mic
Worship leader mic
Guest speaker mic
        ↓
Translation Mix / Bus
        ↓
USB channel
        ↓
Church Caption
```

This should remain optional.

Church Caption should default to the existing livestream feed.

---

## Translation Strategy

Current implementation:

```text
Chrome Speech Recognition
        ↓
Chinese text
        ↓
Gemini generateContent
        ↓
English caption
```

Current limitation:

Gemini request/response translation can hit rate limits during rapid speech segments.

Future research should evaluate:

- speech buffering
- duplicate detection
- retry logic
- Gemini Live API
- Google Speech-to-Text
- Chrome Translator API
- audio-first translation

---

## Branch Strategy

### `main`

Stable deployable branch.

Contains the current Cloud Beta implementation.

Use for:

- bug fixes
- README updates
- production-safe improvements
- Vercel deployment

---

### `research/audio-first`

Experimental branch.

Use for:

- audio-first translation experiments
- Gemini Live API research
- Google Speech-to-Text research
- Chrome Translator API experiments
- OBS overlay experiments
- translation engine redesign

This branch may break.

Do not rely on it for Sunday testing.

---

## Architectural Principles

- Keep `main` deployable.
- Protect API keys on the server.
- Do not call Gemini directly from React components.
- Keep Redis access inside API routes.
- Keep UI independent from backend implementation.
- Avoid changing church production AV configuration unless absolutely necessary.
- Validate product decisions in the real church workflow.

---

## Long-Term Vision

Church Caption should become a translation engine that can produce multiple outputs:

```text
Translation Engine
        ↓
Captions
AI voice
Transcript
Service archive
Bible references
```

The first output is live captions.

The larger mission is bilingual worship accessibility.