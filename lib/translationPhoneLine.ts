import { withChurchSearchParam } from "@/lib/churchSlug";
import type { HeadsetLanguageCode } from "@/lib/translationLanguages";

export const PHONE_TRANSLATION_LINE = "phone" as const;

export type TranslationAudioLine = "primary" | typeof PHONE_TRANSLATION_LINE;

export class InvalidTranslationLineError extends Error {
  constructor() {
    super("Unknown translation line.");
  }
}

export function readTranslationAudioLine(
  value: string | null
): TranslationAudioLine {
  if (!value || value === "primary") {
    return "primary";
  }

  if (value === PHONE_TRANSLATION_LINE) {
    return PHONE_TRANSLATION_LINE;
  }

  throw new InvalidTranslationLineError();
}

/** Redis and local audio storage id. The public church slug stays unchanged. */
export function translationAudioStreamId(
  churchSlug: string,
  line: TranslationAudioLine
): string {
  return line === "phone" ? `${churchSlug}:phone` : churchSlug;
}

export function getPhoneTranslationListenPath(churchSlug: string): string {
  return `/listen/${churchSlug}/phone`;
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
  return `${query}${join}line=phone`;
}

export function defaultPhoneLineLanguage(
  currentOutputLanguage: HeadsetLanguageCode
): HeadsetLanguageCode {
  return currentOutputLanguage === "en" ? "zh" : "en";
}
