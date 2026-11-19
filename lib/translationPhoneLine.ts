import { withChurchSearchParam } from "@/lib/churchSlug";
import type { HeadsetLanguageCode } from "@/lib/translationLanguages";

const PHONE_LINE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const PHONE_LINE_ID_PATTERN = /^[abcdefghjkmnpqrstuvwxyz23456789]{6}$/;

export type TranslationAudioLine = "primary" | string;

export class InvalidTranslationLineError extends Error {
  constructor() {
    super("Unknown translation line.");
  }
}

export function isPhoneLineId(
  value: string | null | undefined
): value is string {
  return typeof value === "string" && PHONE_LINE_ID_PATTERN.test(value);
}

export function createPhoneLineId(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);

  return Array.from(
    bytes,
    (byte) => PHONE_LINE_ALPHABET[byte % PHONE_LINE_ALPHABET.length]
  ).join("");
}

export function readTranslationAudioLine(
  value: string | null
): TranslationAudioLine {
  if (!value || value === "primary") {
    return "primary";
  }

  if (isPhoneLineId(value)) {
    return value;
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

export function getPhoneLineOperatorPath(lineId: string): string {
  return `/operator-phone?line=${lineId}`;
}

export function getPhoneTranslationListenPath(
  churchSlug: string,
  lineId: string
): string {
  return `/listen/${churchSlug}/phone/${lineId}`;
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
