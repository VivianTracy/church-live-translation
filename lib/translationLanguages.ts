/** Sermon labels the operator can pick. The translator still detects speech on its own. */
export const SERMON_LANGUAGES = [
  "en",
  "zh",
  "ko",
  "ja",
  "fr",
  "es",
  "pt",
  "th",
  "my",
  "vi",
] as const;

/**
 * Languages the translator can speak on the headsets.
 * Chinese and English stay first. The rest follow English alphabetical order.
 */
export const HEADSET_LANGUAGES = [
  "zh",
  "en",
  "fr",
  "de",
  "hi",
  "id",
  "it",
  "ja",
  "ko",
  "pt",
  "ru",
  "es",
  "vi",
] as const;

export type SermonLanguageCode = (typeof SERMON_LANGUAGES)[number];
export type HeadsetLanguageCode = (typeof HEADSET_LANGUAGES)[number];

/** Output language sent to the translator. */
export type TranslationLanguageCode = HeadsetLanguageCode;

type LabeledLanguageCode = SermonLanguageCode | HeadsetLanguageCode;

export const TRANSLATION_LANGUAGE_LABELS: Record<LabeledLanguageCode, string> =
  {
    en: "English",
    zh: "Chinese",
    ko: "Korean",
    ja: "Japanese",
    fr: "French",
    es: "Spanish",
    pt: "Portuguese",
    th: "Thai",
    my: "Burmese",
    vi: "Vietnamese",
    de: "German",
    hi: "Hindi",
    id: "Indonesian",
    it: "Italian",
    ru: "Russian",
  };

export const SERMON_LANGUAGE_STORAGE_KEY = "church-caption-sermon-language";
export const HEADSET_LANGUAGE_STORAGE_KEY = "church-caption-headset-language";

export const DEFAULT_SERMON_LANGUAGE: SermonLanguageCode = "zh";
export const DEFAULT_HEADSET_LANGUAGE: HeadsetLanguageCode = "en";

const SERMON_LANGUAGE_CODES = new Set<string>(SERMON_LANGUAGES);
const HEADSET_LANGUAGE_CODES = new Set<string>(HEADSET_LANGUAGES);

export function isSermonLanguageCode(
  value: string | null | undefined
): value is SermonLanguageCode {
  return typeof value === "string" && SERMON_LANGUAGE_CODES.has(value);
}

export function isHeadsetLanguageCode(
  value: string | null | undefined
): value is HeadsetLanguageCode {
  return typeof value === "string" && HEADSET_LANGUAGE_CODES.has(value);
}

/** True when the translator can speak this language. */
export function isTranslationLanguageCode(
  value: string | null | undefined
): value is TranslationLanguageCode {
  return isHeadsetLanguageCode(value);
}

export function translationLanguagesMatch(
  sermonLanguage: SermonLanguageCode,
  headsetLanguage: HeadsetLanguageCode
): boolean {
  return sermonLanguage === headsetLanguage;
}

export function formatTranslationLanguagePair(
  sermonLanguage: SermonLanguageCode,
  headsetLanguage: HeadsetLanguageCode
): string {
  return `${TRANSLATION_LANGUAGE_LABELS[sermonLanguage]} → ${TRANSLATION_LANGUAGE_LABELS[headsetLanguage]}`;
}

export function headsetChannelSummary(
  sermonLanguage: SermonLanguageCode,
  headsetLanguage: HeadsetLanguageCode
): string {
  const sermon = TRANSLATION_LANGUAGE_LABELS[sermonLanguage];
  const headset = TRANSLATION_LANGUAGE_LABELS[headsetLanguage];

  return `${sermon} audio becomes ${headset} audio for wireless receivers.`;
}

function loadStoredLanguage<Code extends string>(
  key: string,
  fallback: Code,
  isCode: (value: string | null) => value is Code
): Code {
  if (typeof window === "undefined") {
    return fallback;
  }

  const stored = window.localStorage.getItem(key);

  return isCode(stored) ? stored : fallback;
}

export function loadStoredSermonLanguage(): SermonLanguageCode {
  return loadStoredLanguage(
    SERMON_LANGUAGE_STORAGE_KEY,
    DEFAULT_SERMON_LANGUAGE,
    isSermonLanguageCode
  );
}

export function loadStoredHeadsetLanguage(): HeadsetLanguageCode {
  return loadStoredLanguage(
    HEADSET_LANGUAGE_STORAGE_KEY,
    DEFAULT_HEADSET_LANGUAGE,
    isHeadsetLanguageCode
  );
}

function saveStoredLanguage(key: string, language: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, language);
}

export function saveStoredSermonLanguage(language: SermonLanguageCode): void {
  saveStoredLanguage(SERMON_LANGUAGE_STORAGE_KEY, language);
}

export function saveStoredHeadsetLanguage(language: HeadsetLanguageCode): void {
  saveStoredLanguage(HEADSET_LANGUAGE_STORAGE_KEY, language);
}
