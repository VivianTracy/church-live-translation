import { operatorSessionReturnPath } from "@/lib/operatorRoutes";
import {
  DEFAULT_HEADSET_LANGUAGE,
  DEFAULT_SERMON_LANGUAGE,
  HEADSET_LANGUAGES,
  HEADSET_LANGUAGE_STORAGE_KEY,
  SERMON_LANGUAGES,
  SERMON_LANGUAGE_STORAGE_KEY,
  formatTranslationLanguagePair,
  headsetChannelSummary,
  isHeadsetLanguageCode,
  isSermonLanguageCode,
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
  it("keeps a short sermon list and every language the translator can speak", () => {
    expect(SERMON_LANGUAGES).toEqual([
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
    ]);
    expect(HEADSET_LANGUAGES).toEqual([
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
    ]);
    expect(isSermonLanguageCode("th")).toBe(true);
    expect(isSermonLanguageCode("my")).toBe(true);
    expect(isSermonLanguageCode("vi")).toBe(true);
    expect(isSermonLanguageCode("de")).toBe(false);
    expect(isHeadsetLanguageCode("de")).toBe(true);
    expect(isHeadsetLanguageCode("vi")).toBe(true);
    expect(isHeadsetLanguageCode("th")).toBe(false);
    expect(isHeadsetLanguageCode("my")).toBe(false);
    expect(isTranslationLanguageCode("ru")).toBe(true);
    expect(isTranslationLanguageCode("th")).toBe(false);
    expect(isTranslationLanguageCode("pt-BR")).toBe(false);
    expect(isTranslationLanguageCode("zh-CN")).toBe(false);
    expect(isTranslationLanguageCode(undefined)).toBe(false);
  });

  it("blocks a sermon and headset in the same language", () => {
    expect(translationLanguagesMatch("ja", "ja")).toBe(true);
    expect(translationLanguagesMatch("zh", "en")).toBe(false);
    expect(translationLanguagesMatch("th", "en")).toBe(false);
    expect(translationLanguagesMatch("vi", "vi")).toBe(true);
  });

  it("formats the pair for the operator summary", () => {
    expect(formatTranslationLanguagePair("ja", "en")).toBe("Japanese → English");
    expect(formatTranslationLanguagePair("th", "vi")).toBe("Thai → Vietnamese");
    expect(headsetChannelSummary("my", "en")).toBe(
      "Burmese audio becomes English audio for wireless receivers."
    );
  });

  it("stores sermon and headset languages separately from Chinese–English direction", () => {
    const store = mockLocalStorage();

    expect(loadStoredSermonLanguage()).toBe(DEFAULT_SERMON_LANGUAGE);
    expect(loadStoredHeadsetLanguage()).toBe(DEFAULT_HEADSET_LANGUAGE);

    saveStoredSermonLanguage("th");
    saveStoredHeadsetLanguage("vi");

    expect(store.get(SERMON_LANGUAGE_STORAGE_KEY)).toBe("th");
    expect(store.get(HEADSET_LANGUAGE_STORAGE_KEY)).toBe("vi");
    expect(loadStoredSermonLanguage()).toBe("th");
    expect(loadStoredHeadsetLanguage()).toBe("vi");
  });

  it("ignores an unknown stored language", () => {
    const store = mockLocalStorage();
    store.set(SERMON_LANGUAGE_STORAGE_KEY, "de");
    store.set(HEADSET_LANGUAGE_STORAGE_KEY, "th");

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
