import {
  clampAudioOutputVolume,
  DEFAULT_AUDIO_OUTPUT_VOLUME,
  loadStoredAudioOutputVolume,
  saveStoredAudioOutputVolume,
} from "@/lib/audioOutputVolumeStorage";
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
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("audio output volume storage", () => {
  it("clamps volume to 0–1 and rejects non-finite values", () => {
    expect(clampAudioOutputVolume(0.4)).toBe(0.4);
    expect(clampAudioOutputVolume(-1)).toBe(0);
    expect(clampAudioOutputVolume(2)).toBe(1);
    expect(clampAudioOutputVolume(Number.NaN)).toBe(DEFAULT_AUDIO_OUTPUT_VOLUME);
  });

  it("defaults to full volume when nothing is stored", () => {
    mockLocalStorage();

    expect(loadStoredAudioOutputVolume()).toBe(DEFAULT_AUDIO_OUTPUT_VOLUME);
  });

  it("remembers a stored output volume", () => {
    mockLocalStorage();

    saveStoredAudioOutputVolume(0.65);

    expect(loadStoredAudioOutputVolume()).toBe(0.65);
  });
});
