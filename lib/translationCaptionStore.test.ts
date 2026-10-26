import {
  clearTranslationCaptionSnapshots,
  getTranslationCaptionSnapshot,
  translationCaptionRedisKey,
  updateTranslationCaption,
} from "@/lib/translationCaptionStore";
import { captionFeedAfter } from "@/lib/translationCaptionTrack";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("caption storage", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses one Redis key per church and track", () => {
    expect(translationCaptionRedisKey("pvccc", "original")).toBe(
      "translation-captions:pvccc:original"
    );
    expect(translationCaptionRedisKey("pvccc", "translation")).toBe(
      "translation-captions:pvccc:translation"
    );
  });

  it("keeps churches and tracks separate, then clears them together", async () => {
    vi.stubEnv("LISTEN_STORAGE", "local");

    await updateTranslationCaption("caption-a", "original", {
      text: "原文",
      final: true,
      languageLabel: "Chinese",
      languageCode: "zh",
      revision: 1,
    });
    await updateTranslationCaption("caption-a", "translation", {
      text: "English line",
      final: false,
      languageLabel: "English",
      languageCode: "en",
      revision: 2,
    });
    await updateTranslationCaption("caption-b", "original", {
      text: "Other church",
      final: true,
      languageLabel: "English",
      languageCode: "en",
      revision: 1,
    });

    const original = await getTranslationCaptionSnapshot("caption-a", "original");
    const translation = await getTranslationCaptionSnapshot(
      "caption-a",
      "translation"
    );
    const other = await getTranslationCaptionSnapshot("caption-b", "original");

    expect(original.lines.map((line) => line.text)).toEqual(["原文"]);
    expect(translation.partial).toBe("English line");
    expect(other.lines.map((line) => line.text)).toEqual(["Other church"]);
    expect(captionFeedAfter(original, 0).lines).toHaveLength(1);
    expect(captionFeedAfter(original, original.latestSeq).lines).toEqual([]);

    await clearTranslationCaptionSnapshots("caption-a", 3);

    const cleared = await getTranslationCaptionSnapshot("caption-a", "original");
    const otherAfterClear = await getTranslationCaptionSnapshot(
      "caption-b",
      "original"
    );

    expect(cleared.isLive).toBe(false);
    expect(cleared.lines).toEqual([]);
    expect(otherAfterClear.lines.map((line) => line.text)).toEqual([
      "Other church",
    ]);
  });

  it("ignores a caption update that arrives after a newer one", async () => {
    vi.stubEnv("LISTEN_STORAGE", "local");

    await updateTranslationCaption("caption-order", "translation", {
      text: "newer",
      final: false,
      languageLabel: "English",
      languageCode: "en",
      revision: 5,
    });
    const ignored = await updateTranslationCaption("caption-order", "translation", {
      text: "older",
      final: true,
      languageLabel: "English",
      languageCode: "en",
      revision: 4,
    });

    expect(ignored.partial).toBe("newer");
    expect(ignored.lines).toEqual([]);
  });
});
