import {
  applyTranslationCompressor,
  applyTranslationHighShelf,
  routeTranslationOutputDevice,
  TRANSLATION_COMPRESSOR,
  TRANSLATION_HIGHSHELF_FREQUENCY_HZ,
  TRANSLATION_HIGHSHELF_GAIN_DB,
} from "@/lib/translationOutputTone";
import { describe, expect, it } from "vitest";

describe("translation output tone", () => {
  it("cuts the high shelf that makes headsets sound shrill", () => {
    const filter = {
      type: "peaking" as BiquadFilterType,
      frequency: { value: 0 },
      gain: { value: 0 },
    };

    applyTranslationHighShelf(filter);

    expect(filter.type).toBe("highshelf");
    expect(filter.frequency.value).toBe(TRANSLATION_HIGHSHELF_FREQUENCY_HZ);
    expect(filter.gain.value).toBe(TRANSLATION_HIGHSHELF_GAIN_DB);
    expect(filter.gain.value).toBeLessThan(0);
  });

  it("limits peaks without a makeup boost", () => {
    const compressor = {
      threshold: { value: 0 },
      knee: { value: 0 },
      ratio: { value: 1 },
      attack: { value: 0 },
      release: { value: 0 },
    };

    applyTranslationCompressor(compressor);

    expect(compressor.threshold.value).toBe(TRANSLATION_COMPRESSOR.threshold);
    expect(compressor.threshold.value).toBeLessThan(0);
    expect(compressor.ratio.value).toBeGreaterThan(1);
    expect(compressor.knee.value).toBe(TRANSLATION_COMPRESSOR.knee);
    expect(compressor.attack.value).toBe(TRANSLATION_COMPRESSOR.attack);
    expect(compressor.release.value).toBe(TRANSLATION_COMPRESSOR.release);
  });

  it("sends playback to the selected output device", async () => {
    const sinkIds: string[] = [];
    const context = {
      setSinkId: async (sinkId: string) => {
        sinkIds.push(sinkId);
      },
    } as unknown as AudioContext;

    await routeTranslationOutputDevice(context, "");
    await routeTranslationOutputDevice(context, "bluetooth-earpiece");

    expect(sinkIds).toEqual(["", "bluetooth-earpiece"]);
  });
});
