/** Streaming Chinese speech-to-text (Realtime transcription session). */
export const OPENAI_TRANSCRIPTION_MODEL = "gpt-realtime-whisper";

/** Chinese → English caption translation (Realtime text session). */
export const OPENAI_TRANSLATION_MODEL = "gpt-realtime-2";

export const OPENAI_REALTIME_CALLS_URL =
  "https://api.openai.com/v1/realtime/calls";

export const OPENAI_REALTIME_WEBSOCKET_URL =
  "wss://api.openai.com/v1/realtime";

export const OPENAI_TRANSCRIPTION_LANGUAGE = "zh";

/** Balance latency vs accuracy for live captions. */
export const OPENAI_TRANSCRIPTION_DELAY = "low" as const;
