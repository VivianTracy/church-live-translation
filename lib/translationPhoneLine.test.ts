import {
  defaultPhoneLineLanguage,
  readTranslationAudioLine,
  translationAudioStreamId,
  withTranslationLineQuery,
  InvalidTranslationLineError,
} from "@/lib/translationPhoneLine";
import { describe, expect, it } from "vitest";

describe("phone translation line", () => {
  it("keeps the primary church stream and stores the phone line separately", () => {
    expect(translationAudioStreamId("pvccc", "primary")).toBe("pvccc");
    expect(translationAudioStreamId("pvccc", "phone")).toBe("pvccc:phone");
    expect(readTranslationAudioLine(null)).toBe("primary");
    expect(readTranslationAudioLine("phone")).toBe("phone");
    expect(() => readTranslationAudioLine("caption")).toThrow(
      InvalidTranslationLineError
    );
  });

  it("adds the phone line only to phone requests", () => {
    expect(
      withTranslationLineQuery("/api/translation-audio?after=3", "pvccc")
    ).toBe("/api/translation-audio?after=3&church=pvccc");
    expect(
      withTranslationLineQuery(
        "/api/translation-audio?after=3",
        "pvccc",
        "phone"
      )
    ).toBe("/api/translation-audio?after=3&church=pvccc&line=phone");
  });

  it("picks a phone language that is not the headset language", () => {
    expect(defaultPhoneLineLanguage("en")).toBe("zh");
    expect(defaultPhoneLineLanguage("zh")).toBe("en");
    expect(defaultPhoneLineLanguage("vi")).toBe("en");
  });
});
