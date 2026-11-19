import {
  isHeadsetLanguageCode,
  type HeadsetLanguageCode,
} from "@/lib/translationLanguages";

const PRIMARY_LIVE_KEY = "church-translation-primary-live";
const HEADSET_LANGUAGE_KEY = "church-translation-headset-output";

export function writePhoneLineOperatorContext(input: {
  primaryLive: boolean;
  headsetLanguage: HeadsetLanguageCode;
}): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    PRIMARY_LIVE_KEY,
    input.primaryLive ? "1" : "0"
  );
  window.localStorage.setItem(HEADSET_LANGUAGE_KEY, input.headsetLanguage);
}

export function readPhoneLineOperatorContext(): {
  primaryLive: boolean;
  headsetLanguage: HeadsetLanguageCode | null;
} {
  if (typeof window === "undefined") {
    return { primaryLive: false, headsetLanguage: null };
  }

  const storedLanguage = window.localStorage.getItem(HEADSET_LANGUAGE_KEY);

  return {
    primaryLive: window.localStorage.getItem(PRIMARY_LIVE_KEY) === "1",
    headsetLanguage: isHeadsetLanguageCode(storedLanguage)
      ? storedLanguage
      : null,
  };
}

export function clearPhoneLineOperatorLive(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PRIMARY_LIVE_KEY, "0");
}
