/** REST speech-to-text for chunked live captions. */
export const OPENAI_AUDIO_TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";

/** Legacy streaming model (realtime WebSocket — experimental). */
export const OPENAI_TRANSCRIPTION_MODEL = "gpt-realtime-whisper";

/** Chinese → English caption translation (Chat Completions). */
export const OPENAI_CHAT_TRANSLATION_MODEL = "gpt-4o-mini";

/** Optional Realtime text session model (experimental). */
export const OPENAI_TRANSLATION_MODEL = "gpt-realtime-2";

export const OPENAI_REALTIME_CALLS_URL =
  "https://api.openai.com/v1/realtime/calls";

export const OPENAI_REALTIME_WEBSOCKET_URL =
  "wss://api.openai.com/v1/realtime";

export const OPENAI_TRANSCRIPTION_WEBSOCKET_URL =
  "wss://api.openai.com/v1/realtime?intent=transcription";

export const OPENAI_TRANSCRIPTION_LANGUAGE = "zh";

/** Balance latency vs accuracy for live captions. */
export const OPENAI_TRANSCRIPTION_DELAY = "low" as const;

/** Record and transcribe audio in fixed-length REST chunks (ms). */
export const OPENAI_TRANSCRIPTION_CHUNK_MS = 5000;

/** Skip chunks quieter than this RMS/peak (0–1). */
export const OPENAI_TRANSCRIPTION_MIN_RMS = 0.001;

/** Legacy realtime commit interval (ms). */
export const OPENAI_TRANSCRIPTION_COMMIT_MS = 4000;
