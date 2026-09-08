export type ResolvedAudioTranslationDirection = "zh-to-en" | "en-to-zh";
export type AudioTranslationDirection = "auto" | ResolvedAudioTranslationDirection;

export const AUDIO_TRANSLATION_DIRECTION_STORAGE_KEY =
  "church-caption-audio-translation-direction";

export const AUDIO_TRANSLATION_AUTO_RESOLVED_STORAGE_KEY =
  "church-caption-audio-translation-auto-resolved";

const AUDIO_TRANSLATION_DIRECTION_V2_KEY =
  "church-caption-audio-translation-direction-v2";

export type AudioTranslationDirectionConfig = {
  outputLanguage: "en" | "zh";
  inputLanguageLabel: string;
  outputLanguageLabel: string;
  statusLabel: string;
  channelSummary: string;
};

export const AUDIO_TRANSLATION_DIRECTION_LABELS: Record<
  AudioTranslationDirection,
  string
> = {
  auto: "Auto (detect language)",
  "zh-to-en": "Chinese → English",
  "en-to-zh": "English → Chinese",
};

export const AUDIO_TRANSLATION_DIRECTIONS: Record<
  ResolvedAudioTranslationDirection,
  AudioTranslationDirectionConfig
> = {
  "zh-to-en": {
    outputLanguage: "en",
    inputLanguageLabel: "Chinese",
    outputLanguageLabel: "English",
    statusLabel: "OpenAI gpt-realtime-translate (Chinese → English audio)",
    channelSummary: "Chinese audio becomes English audio for wireless receivers.",
  },
  "en-to-zh": {
    outputLanguage: "zh",
    inputLanguageLabel: "English",
    outputLanguageLabel: "Chinese",
    statusLabel: "OpenAI gpt-realtime-translate (English → Chinese audio)",
    channelSummary: "English audio becomes Chinese audio for wireless receivers.",
  },
};

const AUTO_DETECTING_CONFIG: AudioTranslationDirectionConfig = {
  outputLanguage: "en",
  inputLanguageLabel: "Speech",
  outputLanguageLabel: "Translation",
  statusLabel: "OpenAI gpt-realtime-translate (auto-detect Chinese or English)",
  channelSummary:
    "Listens for Chinese or English, then translates to the other language for wireless receivers.",
};

export function isAudioTranslationDirection(
  value: string | null
): value is AudioTranslationDirection {
  return value === "auto" || value === "zh-to-en" || value === "en-to-zh";
}

export function isResolvedAudioTranslationDirection(
  value: string | null
): value is ResolvedAudioTranslationDirection {
  return value === "zh-to-en" || value === "en-to-zh";
}

export function loadStoredAudioTranslationDirection(): AudioTranslationDirection {
  if (typeof window === "undefined") {
    return "auto";
  }

  const migrated = window.localStorage.getItem(AUDIO_TRANSLATION_DIRECTION_V2_KEY);
  const stored = window.localStorage.getItem(AUDIO_TRANSLATION_DIRECTION_STORAGE_KEY);

  if (migrated !== "1") {
    window.localStorage.setItem(AUDIO_TRANSLATION_DIRECTION_V2_KEY, "1");
    window.localStorage.setItem(AUDIO_TRANSLATION_DIRECTION_STORAGE_KEY, "auto");
    // Older builds stored Chinese → English. Auto must win once so an
    // English sermon is not locked to English headset audio.
    return "auto";
  }

  return isAudioTranslationDirection(stored) ? stored : "auto";
}

export function saveStoredAudioTranslationDirection(
  direction: AudioTranslationDirection
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUDIO_TRANSLATION_DIRECTION_STORAGE_KEY, direction);
}

export function loadStoredAutoResolvedDirection(): ResolvedAudioTranslationDirection {
  if (typeof window === "undefined") {
    return "zh-to-en";
  }

  const stored = window.localStorage.getItem(
    AUDIO_TRANSLATION_AUTO_RESOLVED_STORAGE_KEY
  );

  return isResolvedAudioTranslationDirection(stored) ? stored : "zh-to-en";
}

export function saveStoredAutoResolvedDirection(
  direction: ResolvedAudioTranslationDirection
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUDIO_TRANSLATION_AUTO_RESOLVED_STORAGE_KEY, direction);
}

export function directionFromDetectedLanguage(
  language: "zh" | "en"
): ResolvedAudioTranslationDirection {
  return language === "zh" ? "zh-to-en" : "en-to-zh";
}

export function formatAudioTranslationDirectionLabel(
  direction: AudioTranslationDirection,
  resolved: ResolvedAudioTranslationDirection | null = null,
  isDetecting = false
): string {
  if (direction !== "auto") {
    return AUDIO_TRANSLATION_DIRECTION_LABELS[direction];
  }

  if (resolved) {
    return `Auto · ${AUDIO_TRANSLATION_DIRECTION_LABELS[resolved]}`;
  }

  return isDetecting
    ? "Auto · detecting language"
    : AUDIO_TRANSLATION_DIRECTION_LABELS.auto;
}

export function getAudioTranslationDirectionConfig(
  direction: AudioTranslationDirection,
  resolved: ResolvedAudioTranslationDirection | null = null
): AudioTranslationDirectionConfig {
  if (direction !== "auto") {
    return AUDIO_TRANSLATION_DIRECTIONS[direction];
  }

  if (!resolved) {
    return AUTO_DETECTING_CONFIG;
  }

  const locked = AUDIO_TRANSLATION_DIRECTIONS[resolved];

  return {
    ...locked,
    statusLabel: `OpenAI gpt-realtime-translate (Auto · ${AUDIO_TRANSLATION_DIRECTION_LABELS[resolved]} audio)`,
    channelSummary: `Auto-detected. ${locked.channelSummary}`,
  };
}
