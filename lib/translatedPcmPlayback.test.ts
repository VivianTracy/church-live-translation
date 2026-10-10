import { describe, expect, it } from "vitest";
import { pcm16ToBase64 } from "@/lib/compactedMicSender";
import { readTranslationAudioDelta } from "@/lib/translatedPcmPlayback";

describe("readTranslationAudioDelta", () => {
  it("decodes little-endian translation audio", () => {
    const pcm16 = Int16Array.from([0, 1000, -1000, 32767, -32768]);
    const decoded = readTranslationAudioDelta({
      delta: pcm16ToBase64(pcm16),
    });

    expect(Array.from(decoded ?? [])).toEqual(Array.from(pcm16));
  });

  it("ignores an empty delta", () => {
    expect(readTranslationAudioDelta({})).toBeNull();
  });
});
