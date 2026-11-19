import {
  defaultPhoneLineLanguage,
  getPhoneLineOperatorPath,
  getPhoneTranslationListenPath,
  headsetLanguageFromPhoneLine,
  phoneLanguageSlug,
  readTranslationAudioLine,
  translationAudioStreamId,
  withTranslationLineQuery,
  InvalidTranslationLineError,
} from "@/lib/translationPhoneLine";
import { describe, expect, it } from "vitest";

describe("phone translation line", () => {
  it("stores each phone language separately from the headset stream", () => {
    expect(translationAudioStreamId("pvccc", "primary")).toBe("pvccc");
    expect(translationAudioStreamId("pvccc", "english")).toBe(
      "pvccc:phone:english"
    );
    expect(translationAudioStreamId("pvccc", "chinese")).toBe(
      "pvccc:phone:chinese"
    );
    expect(readTranslationAudioLine(null)).toBe("primary");
    expect(readTranslationAudioLine("english")).toBe("english");
    expect(readTranslationAudioLine("zh")).toBe("chinese");
    expect(() => readTranslationAudioLine("phone")).toThrow(
      InvalidTranslationLineError
    );
    expect(() => readTranslationAudioLine("thai")).toThrow(
      InvalidTranslationLineError
    );
  });

  it("puts the selected language in the public listen address", () => {
    expect(
      withTranslationLineQuery("/api/translation-audio?after=3", "pvccc")
    ).toBe("/api/translation-audio?after=3&church=pvccc");
    expect(
      withTranslationLineQuery(
        "/api/translation-audio?after=3",
        "pvccc",
        "english"
      )
    ).toBe("/api/translation-audio?after=3&church=pvccc&line=english");
    expect(getPhoneTranslationListenPath("pvccc", "en")).toBe(
      "/listen/pvccc/phone/english"
    );
    expect(getPhoneTranslationListenPath("pvccc", phoneLanguageSlug("vi"))).toBe(
      "/listen/pvccc/phone/vietnamese"
    );
    expect(getPhoneLineOperatorPath()).toBe("/operator-phone");
    expect(headsetLanguageFromPhoneLine("Chinese")).toBe("zh");
    expect(headsetLanguageFromPhoneLine("caption")).toBeNull();
  });

  it("picks a phone language that is not the headset language", () => {
    expect(defaultPhoneLineLanguage("en")).toBe("zh");
    expect(defaultPhoneLineLanguage("zh")).toBe("en");
    expect(defaultPhoneLineLanguage("vi")).toBe("en");
  });
});
