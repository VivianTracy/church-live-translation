# OpenAI Whisper + GPT Realtime operator

Experimental audio stack for Church Caption:

```text
Microphone (WebRTC)
        ↓
gpt-realtime-whisper   ← Chinese transcription
        ↓
Sentence caption pipeline
        ↓
gpt-realtime-2         ← Chinese → English captions (Realtime text)
        ↓
Redis caption state
        ↓
/overlay (OBS Browser Source)
        ↓
YouTube stream
```

This branch adds **`/operator-openai`** while keeping the existing Gemini + Chrome STT operator at **`/operator`**.

---

## Accounts and billing (required)

OpenAI API access is **pay-as-you-go**. There is no separate “Church Caption subscription.” You need:

1. An OpenAI account
2. A payment method on file
3. An API key with access to Realtime models

### Links

| What | Link |
|---|---|
| Create OpenAI account | https://platform.openai.com/signup |
| Sign in | https://platform.openai.com/login |
| API keys | https://platform.openai.com/api-keys |
| Billing / add payment method | https://platform.openai.com/settings/organization/billing/overview |
| Usage dashboard | https://platform.openai.com/usage |
| Pricing (all models) | https://openai.com/api/pricing/ |
| Realtime API overview | https://developers.openai.com/api/docs/guides/realtime |
| Realtime transcription (`gpt-realtime-whisper`) | https://developers.openai.com/api/docs/guides/realtime-transcription |
| Realtime models reference | https://developers.openai.com/api/docs/models/gpt-realtime-whisper |

### Models used by this branch

| Role | Model | Billing style (check pricing page for current rates) |
|---|---|---|
| Transcription | `gpt-realtime-whisper` | Per minute of audio |
| Translation | `gpt-realtime-2` | Realtime tokens (text output) |

**Note:** ChatGPT Plus (https://chatgpt.com) is **not** the same as API access. You still need platform billing and an API key.

### Free tier

Realtime transcription is **not available on the free API tier**. You need at least **Tier 1** paid usage before production testing.

Check limits: https://platform.openai.com/settings/organization/limits

---

## Local setup

1. Copy `.env.example` → `.env.local`
2. Set existing keys (`GEMINI_API_KEY`, Redis/KV) as before
3. Add:

```bash
OPENAI_API_KEY=sk-...
```

4. Install and run:

```bash
npm install
npm run dev
```

5. Open the operator:

```text
http://localhost:3000/operator-openai
```

For the 7-minute AV replay clip (OBS → BlackHole), use:

```text
http://localhost:3000/operator-openai?test=1
```

6. Add `http://localhost:3000/overlay` as an OBS Browser Source and confirm captions on stream.

---

## Architecture notes

### Why Whisper Realtime instead of Chrome STT?

Chrome speech recognition is free but:

- Final results arrive in large, uneven chunks
- Behavior differs on virtual audio (OBS / BlackHole)
- No server-side control over latency vs accuracy

`gpt-realtime-whisper` streams transcript deltas over WebRTC and exposes a **`delay`** setting (`low` is used for live captions).

### Why GPT Realtime for translation?

`gpt-realtime-2` keeps the same Realtime session model family as transcription while allowing a custom sermon prompt (Bible names, 退修會 → retreat, etc.).

**Alternative (not implemented here):** `gpt-realtime-translate` translates audio directly to English but does **not** support custom sermon instructions. See https://developers.openai.com/api/docs/guides/realtime-translation

---

## Files added

| File | Purpose |
|---|---|
| `app/operator-openai/page.tsx` | Experimental operator UI |
| `app/api/openai/transcription-session/route.ts` | Mint transcription client secret |
| `app/api/openai/translation-session/route.ts` | Mint translation client secret |
| `lib/openaiTranscriptionClient.ts` | Browser WebRTC → Whisper |
| `lib/openaiTranslationClient.ts` | Browser WebSocket → GPT Realtime text |
| `lib/useOpenAIOperator.ts` | Operator hook |
| `lib/openaiModels.ts` | Model constants |

---

## Cost planning (rough)

For a **45-minute Chinese sermon**:

- Transcription: ~45 min × Whisper Realtime per-minute rate
- Translation: depends on caption batch count and text length (Realtime text tokens)

Use the usage dashboard after a test run before Sunday. Start with a short 5-minute mic test on `/operator-openai`.

---

## Status

This is a **research branch**. Expect API shape changes, reconnect logic, and prompt tuning before replacing `/operator` in production.

Known follow-ups:

- Reconnect / session expiry handling
- Manual audio buffer commit tuning for `gpt-realtime-whisper` (no server VAD)
- Compare latency vs Gemini REST on the 7-minute AV replay clip
- Sunday validation on church Windows PC + X-USB feed

---

## Related docs

- [`docs/COLLABORATOR_SETUP.md`](./COLLABORATOR_SETUP.md) — clone repo, Cursor, local dev
- [`ARCHITECTURE.md`](../ARCHITECTURE.md) — production AV workflow
