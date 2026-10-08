import { operatorSessionReturnPath } from "@/lib/operatorRoutes";
import {
  DEFAULT_HEADSET_LANGUAGE,
  DEFAULT_SERMON_LANGUAGE,
  HEADSET_LANGUAGE_STORAGE_KEY,
  SERMON_LANGUAGE_STORAGE_KEY,
  formatTranslationLanguagePair,
  headsetChannelSummary,
  isTranslationLanguageCode,
  loadStoredHeadsetLanguage,
  loadStoredSermonLanguage,
  saveStoredHeadsetLanguage,
  saveStoredSermonLanguage,
  translationLanguagesMatch,
} from "@/lib/translationLanguages";
import { afterEach, describe, expect, it, vi } from "vitest";

function mockLocalStorage() {
  const store = new Map<string, string>();

  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
  });

  return store;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("translation languages", () => {
  it("accepts the five headset languages", () => {
    expect(isTranslationLanguageCode("en")).toBe(true);
    expect(isTranslationLanguageCode("zh")).toBe(true);
    expect(isTranslationLanguageCode("ko")).toBe(true);
    expect(isTranslationLanguageCode("fr")).toBe(true);
    expect(isTranslationLanguageCode("es")).toBe(true);
    expect(isTranslationLanguageCode("de")).toBe(false);
    expect(isTranslationLanguageCode(undefined)).toBe(false);
  });

  it("blocks a sermon and headset in the same language", () => {
    expect(translationLanguagesMatch("ko", "ko")).toBe(true);
    expect(translationLanguagesMatch("zh", "en")).toBe(false);
  });

  it("formats the pair for the operator summary", () => {
    expect(formatTranslationLanguagePair("ko", "en")).toBe("Korean → English");
    expect(headsetChannelSummary("fr", "es")).toBe(
      "French audio becomes Spanish audio for wireless receivers."
    );
  });

  it("stores sermon and headset languages separately from Chinese–English direction", () => {
    const store = mockLocalStorage();

    expect(loadStoredSermonLanguage()).toBe(DEFAULT_SERMON_LANGUAGE);
    expect(loadStoredHeadsetLanguage()).toBe(DEFAULT_HEADSET_LANGUAGE);

    saveStoredSermonLanguage("ko");
    saveStoredHeadsetLanguage("fr");

    expect(store.get(SERMON_LANGUAGE_STORAGE_KEY)).toBe("ko");
    expect(store.get(HEADSET_LANGUAGE_STORAGE_KEY)).toBe("fr");
    expect(loadStoredSermonLanguage()).toBe("ko");
    expect(loadStoredHeadsetLanguage()).toBe("fr");
  });

  it("ignores an unknown stored language", () => {
    const store = mockLocalStorage();
    store.set(SERMON_LANGUAGE_STORAGE_KEY, "de");
    store.set(HEADSET_LANGUAGE_STORAGE_KEY, "pt");

    expect(loadStoredSermonLanguage()).toBe("zh");
    expect(loadStoredHeadsetLanguage()).toBe("en");
  });

  it("returns session expiry to the operator page that was open", () => {
    expect(operatorSessionReturnPath("/operator-live")).toBe("/operator-live");
    expect(operatorSessionReturnPath("/operator-languages")).toBe(
      "/operator-languages"
    );
    expect(operatorSessionReturnPath("/operator")).toBe("/operator-live");
  });
});
