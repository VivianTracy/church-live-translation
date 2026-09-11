import {
  appendTranslationAudioChunk,
  getTranslationAudioChunksAfter,
  parseTranslationAudioChunk,
  translationAudioRedisKeys,
} from "@/lib/translationAudioStore";
import { afterEach, describe, expect, it, vi } from "vitest";

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

describe("church-scoped translation audio", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses a Redis key per church", () => {
    expect(translationAudioRedisKeys("pvccc")).toEqual({
      meta: "translation-audio-meta:pvccc",
      chunks: "translation-audio-chunks:pvccc",
      seq: "translation-audio-seq:pvccc",
    });
  });

  it("keeps local audio streams separate per church", async () => {
    vi.stubEnv("LISTEN_STORAGE", "local");

    await appendTranslationAudioChunk("pvccc", "audio/wav", "church-a");
    await appendTranslationAudioChunk("other-church", "audio/wav", "church-b");

    const pvccc = await getTranslationAudioChunksAfter("pvccc", 0);
    const other = await getTranslationAudioChunksAfter("other-church", 0);

    expect(pvccc.chunks.map((item) => item.data)).toEqual(["church-a"]);
    expect(other.chunks.map((item) => item.data)).toEqual(["church-b"]);
  });
});
