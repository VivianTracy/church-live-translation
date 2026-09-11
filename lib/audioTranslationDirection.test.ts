import {
  AUDIO_TRANSLATION_DIRECTION_STORAGE_KEY,
  directionFromDetectedLanguage,
  formatAudioTranslationDirectionLabel,
  getAudioTranslationDirectionConfig,
  loadStoredAudioTranslationDirection,
  oppositeAudioTranslationDirection,
  saveStoredAudioTranslationDirection,
  shouldProbeOppositeAutoDirection,
} from "@/lib/audioTranslationDirection";
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

describe("audio translation direction", () => {
  it("maps detected speech to the headset output language", () => {
    expect(directionFromDetectedLanguage("zh")).toBe("zh-to-en");
    expect(directionFromDetectedLanguage("en")).toBe("en-to-zh");
  });

  it("probes the opposite Auto direction after silence on a loud input", () => {
    expect(
      shouldProbeOppositeAutoDirection({
        elapsedMs: 8000,
        isTranslating: false,
        inputPeak: 0.2,
        alreadyProbed: false,
      })
    ).toBe(true);
    expect(
      shouldProbeOppositeAutoDirection({
        elapsedMs: 8000,
        isTranslating: true,
        inputPeak: 0.2,
        alreadyProbed: false,
      })
    ).toBe(false);
    expect(oppositeAudioTranslationDirection("zh-to-en")).toBe("en-to-zh");
  });

  it("formats auto labels after a direction is resolved", () => {
    expect(formatAudioTranslationDirectionLabel("auto")).toBe(
      "Auto (detect language)"
    );
    expect(formatAudioTranslationDirectionLabel("auto", "zh-to-en")).toBe(
      "Auto · Chinese → English"
    );
    expect(formatAudioTranslationDirectionLabel("en-to-zh")).toBe(
      "English → Chinese"
    );
  });

  it("uses last resolved auto direction for output audio", () => {
    const config = getAudioTranslationDirectionConfig("auto", "en-to-zh");

    expect(config.outputLanguage).toBe("zh");
    expect(config.inputLanguageLabel).toBe("English");
  });

  it("remembers the operator's selected direction", () => {
    mockLocalStorage();

    saveStoredAudioTranslationDirection("en-to-zh");

    expect(loadStoredAudioTranslationDirection()).toBe("en-to-zh");
    expect(
      window.localStorage.getItem(AUDIO_TRANSLATION_DIRECTION_STORAGE_KEY)
    ).toBe("en-to-zh");
  });
});
