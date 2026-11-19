import {
  createPhoneLineId,
  defaultPhoneLineLanguage,
  getPhoneLineOperatorPath,
  getPhoneTranslationListenPath,
  isPhoneLineId,
  readTranslationAudioLine,
  translationAudioStreamId,
  withTranslationLineQuery,
  InvalidTranslationLineError,
} from "@/lib/translationPhoneLine";
import { describe, expect, it } from "vitest";

describe("phone translation line", () => {
  it("keeps the primary church stream and stores each phone window separately", () => {
    expect(translationAudioStreamId("pvccc", "primary")).toBe("pvccc");
    expect(translationAudioStreamId("pvccc", "ab23cd")).toBe(
      "pvccc:phone:ab23cd"
    );
    expect(translationAudioStreamId("pvccc", "k7m2np")).not.toBe(
      translationAudioStreamId("pvccc", "ab23cd")
    );
    expect(readTranslationAudioLine(null)).toBe("primary");
    expect(readTranslationAudioLine("ab23cd")).toBe("ab23cd");
    expect(() => readTranslationAudioLine("phone")).toThrow(
      InvalidTranslationLineError
    );
    expect(() => readTranslationAudioLine("caption")).toThrow(
      InvalidTranslationLineError
    );
  });

  it("adds the phone line only to that window's requests", () => {
    expect(
      withTranslationLineQuery("/api/translation-audio?after=3", "pvccc")
    ).toBe("/api/translation-audio?after=3&church=pvccc");
    expect(
      withTranslationLineQuery(
        "/api/translation-audio?after=3",
        "pvccc",
        "ab23cd"
      )
    ).toBe("/api/translation-audio?after=3&church=pvccc&line=ab23cd");
    expect(getPhoneTranslationListenPath("pvccc", "ab23cd")).toBe(
      "/listen/pvccc/phone/ab23cd"
    );
    expect(getPhoneLineOperatorPath("ab23cd")).toBe(
      "/operator-phone?line=ab23cd"
    );
  });

  it("creates a short id for each new window", () => {
    const ids = new Set(Array.from({ length: 20 }, () => createPhoneLineId()));

    expect(ids.size).toBe(20);

    for (const id of ids) {
      expect(isPhoneLineId(id)).toBe(true);
    }

    expect(isPhoneLineId("phone")).toBe(false);
    expect(isPhoneLineId("abc")).toBe(false);
  });

  it("picks a phone language that is not the headset language", () => {
    expect(defaultPhoneLineLanguage("en")).toBe("zh");
    expect(defaultPhoneLineLanguage("zh")).toBe("en");
    expect(defaultPhoneLineLanguage("vi")).toBe("en");
  });
});
