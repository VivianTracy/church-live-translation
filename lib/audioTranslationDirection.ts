export type AudioTranslationDirection = "zh-to-en" | "en-to-zh";

export const AUDIO_TRANSLATION_DIRECTION_STORAGE_KEY =
  "church-caption-audio-translation-direction";

export type AudioTranslationDirectionConfig = {
  outputLanguage: "en" | "zh";
  inputLanguageLabel: string;
  outputLanguageLabel: string;
  statusLabel: string;
  channelSummary: string;
};

export const AUDIO_TRANSLATION_DIRECTIONS: Record<
  AudioTranslationDirection,
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

export function loadStoredAudioTranslationDirection(): AudioTranslationDirection {
  if (typeof window === "undefined") {
    return "zh-to-en";
  }

  const stored = window.localStorage.getItem(AUDIO_TRANSLATION_DIRECTION_STORAGE_KEY);

  return stored === "en-to-zh" ? "en-to-zh" : "zh-to-en";
}

export function saveStoredAudioTranslationDirection(
  direction: AudioTranslationDirection
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUDIO_TRANSLATION_DIRECTION_STORAGE_KEY, direction);
}

export function getAudioTranslationDirectionConfig(
  direction: AudioTranslationDirection
): AudioTranslationDirectionConfig {
  return AUDIO_TRANSLATION_DIRECTIONS[direction];
}
