export const TRANSLATION_LANGUAGES = ["en", "zh", "ko", "fr", "es"] as const;

export type TranslationLanguageCode = (typeof TRANSLATION_LANGUAGES)[number];

export const TRANSLATION_LANGUAGE_LABELS: Record<
  TranslationLanguageCode,
  string
> = {
  en: "English",
  zh: "Chinese",
  ko: "Korean",
  fr: "French",
  es: "Spanish",
};

export const SERMON_LANGUAGE_STORAGE_KEY = "church-caption-sermon-language";
export const HEADSET_LANGUAGE_STORAGE_KEY = "church-caption-headset-language";

export const DEFAULT_SERMON_LANGUAGE: TranslationLanguageCode = "zh";
export const DEFAULT_HEADSET_LANGUAGE: TranslationLanguageCode = "en";

export function isTranslationLanguageCode(
  value: string | null | undefined
): value is TranslationLanguageCode {
  return (
    value === "en" ||
    value === "zh" ||
    value === "ko" ||
    value === "fr" ||
    value === "es"
  );
}

export function translationLanguagesMatch(
  sermonLanguage: TranslationLanguageCode,
  headsetLanguage: TranslationLanguageCode
): boolean {
  return sermonLanguage === headsetLanguage;
}

export function formatTranslationLanguagePair(
  sermonLanguage: TranslationLanguageCode,
  headsetLanguage: TranslationLanguageCode
): string {
  return `${TRANSLATION_LANGUAGE_LABELS[sermonLanguage]} → ${TRANSLATION_LANGUAGE_LABELS[headsetLanguage]}`;
}

export function headsetChannelSummary(
  sermonLanguage: TranslationLanguageCode,
  headsetLanguage: TranslationLanguageCode
): string {
  const sermon = TRANSLATION_LANGUAGE_LABELS[sermonLanguage];
  const headset = TRANSLATION_LANGUAGE_LABELS[headsetLanguage];

  return `${sermon} audio becomes ${headset} audio for wireless receivers.`;
}

function loadStoredLanguage(
  key: string,
  fallback: TranslationLanguageCode
): TranslationLanguageCode {
  if (typeof window === "undefined") {
    return fallback;
  }

  const stored = window.localStorage.getItem(key);

  return isTranslationLanguageCode(stored) ? stored : fallback;
}

export function loadStoredSermonLanguage(): TranslationLanguageCode {
  return loadStoredLanguage(SERMON_LANGUAGE_STORAGE_KEY, DEFAULT_SERMON_LANGUAGE);
}

export function loadStoredHeadsetLanguage(): TranslationLanguageCode {
  return loadStoredLanguage(
    HEADSET_LANGUAGE_STORAGE_KEY,
    DEFAULT_HEADSET_LANGUAGE
  );
}

function saveStoredLanguage(key: string, language: TranslationLanguageCode): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, language);
}

export function saveStoredSermonLanguage(language: TranslationLanguageCode): void {
  saveStoredLanguage(SERMON_LANGUAGE_STORAGE_KEY, language);
}

export function saveStoredHeadsetLanguage(
  language: TranslationLanguageCode
): void {
  saveStoredLanguage(HEADSET_LANGUAGE_STORAGE_KEY, language);
}
