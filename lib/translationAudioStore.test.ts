import { parseTranslationAudioChunk } from "@/lib/translationAudioStore";
import { describe, expect, it } from "vitest";

const chunk = {
  seq: 81,
  mimeType: "audio/wav",
  data: "UklGRg==",
  createdAt: 1_789_000_424_101,
};

describe("translation audio chunk parsing", () => {
  it("accepts JSON strings returned by Redis", () => {
    expect(parseTranslationAudioChunk(JSON.stringify(chunk))).toEqual(chunk);
  });

  it("accepts objects auto-deserialized by Upstash", () => {
    expect(parseTranslationAudioChunk(chunk)).toEqual(chunk);
  });

  it("rejects malformed chunks", () => {
    expect(parseTranslationAudioChunk({ seq: 81 })).toBeNull();
    expect(parseTranslationAudioChunk("not-json")).toBeNull();
  });
});
