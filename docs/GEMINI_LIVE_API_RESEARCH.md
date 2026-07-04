# Gemini Live API Research

## Problem

The current Cloud Beta pipeline is too slow for live worship captions:

```text
Chrome Speech Recognition
  → 800ms speech buffer
  → POST /api/translate (new HTTP request every segment)
  → ~1,200-token system prompt resent on every call
  → wait for full Gemini response
  → POST /api/caption-state
```

In a real sermon this feels batchy (multi-second gaps), not live.

## Google APIs considered

| API | Latency profile | Church prompt | Caption text | Verdict |
| --- | --- | --- | --- | --- |
| **Gemini `generateContent` (current)** | 0.6–15s per segment | Yes | Yes | Too slow at scale |
| **Gemini `generateContentStream`** | Faster time-to-first-token | Yes | Yes | Easy win, still per-request prompt |
| **Gemini Live API (agent, TEXT output)** | Streaming session, prompt sent once | Yes | Yes | **Recommended for this project** |
| **Gemini 3.5 Live Translate** | ~3s first audio, continuous | No | Sidecar transcript only | Fast, but no sermon terminology |
| **Cloud Speech-to-Text + Translate** | Turn-based, multi-hop | Via glossary only | Yes | Higher ops complexity |

## Recommendation: Gemini Live API

Use a **persistent Live API WebSocket session** with:

- Model: `gemini-live-2.5-flash-preview` (or latest live flash preview)
- `responseModalities: [TEXT]`
- `systemInstruction`: church translation policy (sent once per session)
- Chinese text from Chrome STT via `sendClientContent` with `turnComplete: true`
- Stream partial English captions from `serverContent.modelTurn.parts[].text`

### Why not Live Translate?

`gemini-3.5-live-translate-preview` is optimized for speech-to-speech interpretation. It does **not** support custom system instructions, so we lose Bible book names, sermon style rules, and church terminology.

### Expected gains

1. **No per-segment HTTP round trip** — one WebSocket for the whole service
2. **System prompt sent once** — saves ~1,200 input tokens × every segment
3. **Streaming output** — show partial captions while the model is still writing
4. **Optional next step** — pipe X32/USB audio directly into Live API (audio-first)

## Experiment on this branch

- `scripts/benchmark-gemini-live-api.mjs` — compare REST vs Live latency locally
- `/operator-live` — experimental operator UI using Live API + ephemeral token
- `/api/live/token` — mint short-lived client token (v1alpha)

## Benchmark results (local sample, 3 sentences)

Initial run on this branch:

| Path | Typical latency | Notes |
| --- | --- | --- |
| REST `generateContent` | 440–760ms | Plus 800ms speech buffer in production |
| REST `generateContentStream` | **~350–510ms first token** | Quick win on current architecture |
| Live API TEXT session | Needs model/key validation | WebSocket session; prompt sent once |

Run locally:

```bash
node scripts/benchmark-gemini-live-api.mjs
```

If Live API times out, verify your key supports `gemini-live-2.5-flash-preview` in [Google AI Studio](https://aistudio.google.com/).

## References

- [Gemini Live API overview](https://ai.google.dev/gemini-api/docs/live)
- [Live translation (no custom instructions)](https://ai.google.dev/gemini-api/docs/live-api/live-translate)
- [Ephemeral tokens](https://ai.google.dev/gemini-api/docs/live#ephemeral-tokens)
