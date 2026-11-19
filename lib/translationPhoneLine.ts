import { withChurchSearchParam } from "@/lib/churchSlug";
import {
  HEADSET_LANGUAGES,
  TRANSLATION_LANGUAGE_LABELS,
  type HeadsetLanguageCode,
} from "@/lib/translationLanguages";

export type TranslationAudioLine = "primary" | string;

export class InvalidTranslationLineError extends Error {
  constructor() {
    super("Unknown translation line.");
  }
}

/** Public path segment, such as "english" or "chinese". */
export function phoneLanguageSlug(language: HeadsetLanguageCode): string {
  return TRANSLATION_LANGUAGE_LABELS[language].toLowerCase();
}

export function headsetLanguageFromPhoneLine(
  value: string | null | undefined
): HeadsetLanguageCode | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  for (const code of HEADSET_LANGUAGES) {
    if (normalized === code || normalized === phoneLanguageSlug(code)) {
      return code;
    }
  }

  return null;
}

export function readPhoneLineSlug(
  value: string | null | undefined
): string | null {
  const language = headsetLanguageFromPhoneLine(value);
  return language ? phoneLanguageSlug(language) : null;
}

export function readTranslationAudioLine(
  value: string | null
): TranslationAudioLine {
  if (!value || value === "primary") {
    return "primary";
  }

  const slug = readPhoneLineSlug(value);

  if (slug) {
    return slug;
  }

  throw new InvalidTranslationLineError();
}

/** Redis and local audio storage id. The public church slug stays unchanged. */
export function translationAudioStreamId(
  churchSlug: string,
  line: TranslationAudioLine
): string {
  return line === "primary" ? churchSlug : `${churchSlug}:phone:${line}`;
}

export function getPhoneLineOperatorPath(): string {
  return "/operator-phone";
}

export function getPhoneTranslationListenPath(
  churchSlug: string,
  language: HeadsetLanguageCode | string
): string {
  const slug = readPhoneLineSlug(language) ?? language;
  return `/listen/${churchSlug}/phone/${slug}`;
}

export function withTranslationLineQuery(
  path: string,
  churchSlug: string,
  line: TranslationAudioLine = "primary"
): string {
  const query = withChurchSearchParam(path, churchSlug);

  if (line === "primary") {
    return query;
  }

  const join = query.includes("?") ? "&" : "?";
  return `${query}${join}line=${line}`;
}

export function defaultPhoneLineLanguage(
  currentOutputLanguage: HeadsetLanguageCode
): HeadsetLanguageCode {
  return currentOutputLanguage === "en" ? "zh" : "en";
}
