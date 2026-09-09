import { detectSpeechLanguage } from "@/lib/detectSpeechLanguage";
import { describe, expect, it } from "vitest";

describe("detectSpeechLanguage", () => {
  it("returns null until there is enough text", () => {
    expect(detectSpeechLanguage("")).toBeNull();
    expect(detectSpeechLanguage("Amen")).toBeNull();
    expect(detectSpeechLanguage("John 3")).toBeNull();
    expect(detectSpeechLanguage("主")).toBeNull();
  });

  it("detects Chinese after enough Han characters", () => {
    expect(detectSpeechLanguage("弟兄姊妹")).toBe("zh");
  });

  it("detects Chinese even when a Bible reference is mixed in", () => {
    expect(detectSpeechLanguage("我们来看 John 3:16 这段经文")).toBe("zh");
  });

  it("detects English after enough Latin letters and no Han", () => {
    expect(detectSpeechLanguage("Let us turn to the gospel together")).toBe("en");
  });

  it("does not flip to English on a short Amen", () => {
    expect(detectSpeechLanguage("Amen")).toBeNull();
  });
});
