import {
  appendCaptionDelta,
  applyCaptionClear,
  applyCaptionUpdateToSnapshot,
  CAPTION_LINE_LIMIT,
  createCaptionTrackPublisher,
  emptyCaptionSnapshot,
  emptyCaptionTrackState,
  finishCaptionUtterance,
  getTranslationCaptionPath,
  mergeCaptionLines,
  parseCaptionTrack,
  resolveCaptionLanguages,
  stripCommittedPrefix,
} from "@/lib/translationCaptionTrack";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("caption tracks", () => {
  it("accepts the two public caption pages", () => {
    expect(parseCaptionTrack("original")).toBe("original");
    expect(parseCaptionTrack("translation")).toBe("translation");
    expect(parseCaptionTrack("english")).toBeNull();
    expect(getTranslationCaptionPath("pvccc", "original")).toBe(
      "/captions/pvccc/original"
    );
  });

  it("names the sermon and headset languages when the operator picked them", () => {
    expect(
      resolveCaptionLanguages({
        sermonLanguage: "ko",
        headsetLanguage: "en",
        direction: "auto",
        resolvedDirection: null,
      })
    ).toEqual({
      original: { label: "Korean", code: "ko" },
      translation: { label: "English", code: "en" },
    });
  });

  it("uses the detected direction on the main operator page", () => {
    expect(
      resolveCaptionLanguages({
        direction: "auto",
        resolvedDirection: null,
      })
    ).toEqual({
      original: { label: "", code: "" },
      translation: { label: "", code: "" },
    });

    expect(
      resolveCaptionLanguages({
        direction: "zh-to-en",
        resolvedDirection: null,
      })
    ).toEqual({
      original: { label: "Chinese", code: "zh" },
      translation: { label: "English", code: "en" },
    });
  });
});

describe("caption utterance assembly", () => {
  it("keeps short speech as an in-progress line", () => {
    const result = appendCaptionDelta(emptyCaptionTrackState(), "Grace ");
    const next = appendCaptionDelta(result.state, "alone.");

    expect(next.lines).toEqual([]);
    expect(next.state.pending).toBe("Grace alone.");
  });

  it("breaks a long line without dropping characters", () => {
    const text = `${"主".repeat(100)}。${"爱".repeat(100)}`;
    const result = appendCaptionDelta(emptyCaptionTrackState(), text);

    expect(result.lines).toEqual([`${"主".repeat(100)}。`]);
    expect(result.state.pending).toBe("爱".repeat(100));
    expect(`${result.lines[0]}${result.state.pending}`).toBe(text);
  });

  it("commits the remainder when the utterance finishes", () => {
    const text = `${"a".repeat(CAPTION_LINE_LIMIT)} more`;
    const partial = appendCaptionDelta(emptyCaptionTrackState(), text);
    const finished = finishCaptionUtterance(partial.state, text);

    expect(finished.line).toBe("more");
  });

  it("does not repeat text that was already committed", () => {
    expect(stripCommittedPrefix("Hello world", "Hello world")).toBe("");
    expect(stripCommittedPrefix("Hello world today", "Hello world")).toBe(
      "today"
    );
  });

  it("uses the model’s finished transcript instead of only the last delta", () => {
    let state = emptyCaptionTrackState();
    state = appendCaptionDelta(state, "Grace ").state;
    const finished = finishCaptionUtterance(state, "Grace alone.");

    expect(finished.line).toBe("Grace alone.");
  });
});

describe("caption track publisher", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits before sending an in-progress line and sends a finished line immediately", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const posts: Array<{ text: string; final: boolean }> = [];
    const publisher = createCaptionTrackPublisher((update) => {
      posts.push(update);
    });

    publisher.append("Hel");
    publisher.append("lo");
    expect(posts).toEqual([]);

    vi.advanceTimersByTime(400);
    expect(posts).toEqual([{ text: "Hello", final: false }]);

    publisher.finish("");
    expect(posts.at(-1)).toEqual({ text: "Hello", final: true });
  });

  it("does not send the partial after the line is already finished", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const posts: Array<{ text: string; final: boolean }> = [];
    const publisher = createCaptionTrackPublisher((update) => {
      posts.push(update);
    });

    publisher.append("Hello");
    publisher.finish("");
    vi.advanceTimersByTime(500);

    expect(posts).toEqual([{ text: "Hello", final: true }]);
  });
});

describe("caption snapshot updates", () => {
  const base = {
    languageLabel: "English",
    languageCode: "en",
    now: 10,
  };

  it("replaces the partial without adding a line", () => {
    const next = applyCaptionUpdateToSnapshot(emptyCaptionSnapshot(), {
      ...base,
      text: "Grace",
      final: false,
      revision: 1,
    });

    expect(next).toMatchObject({
      isLive: true,
      partial: "Grace",
      latestSeq: 0,
      lines: [],
    });
  });

  it("commits a line, clears the partial, and ignores an older update", () => {
    const partial = applyCaptionUpdateToSnapshot(emptyCaptionSnapshot(), {
      ...base,
      text: "Grace",
      final: false,
      revision: 2,
    });
    const committed = applyCaptionUpdateToSnapshot(partial!, {
      ...base,
      text: "Grace alone.",
      final: true,
      revision: 3,
    });

    expect(committed?.partial).toBe("");
    expect(committed?.lines.map((line) => line.text)).toEqual(["Grace alone."]);
    expect(
      applyCaptionUpdateToSnapshot(committed!, {
        ...base,
        text: "stale",
        final: false,
        revision: 3,
      })
    ).toBeNull();
  });

  it("does not repeat the same finished line", () => {
    const first = applyCaptionUpdateToSnapshot(emptyCaptionSnapshot(), {
      ...base,
      text: "Amen.",
      final: true,
      revision: 1,
    });
    const second = applyCaptionUpdateToSnapshot(first!, {
      ...base,
      text: "Amen.",
      final: true,
      revision: 2,
    });

    expect(second?.lines).toHaveLength(1);
    expect(second?.latestSeq).toBe(1);
  });

  it("clears both the lines and the partial when the session stops", () => {
    const live = applyCaptionUpdateToSnapshot(emptyCaptionSnapshot(), {
      ...base,
      text: "Amen.",
      final: true,
      revision: 1,
    });
    const cleared = applyCaptionClear(live!, 2, 20);

    expect(cleared).toMatchObject({
      isLive: false,
      partial: "",
      lines: [],
      latestSeq: 0,
      revision: 2,
    });
    expect(applyCaptionClear(cleared!, 2, 21)).toBeNull();
  });

  it("merges new lines by sequence", () => {
    expect(
      mergeCaptionLines(
        [{ seq: 1, text: "A", createdAt: 1 }],
        [
          { seq: 1, text: "A", createdAt: 1 },
          { seq: 2, text: "B", createdAt: 2 },
        ]
      ).map((line) => line.text)
    ).toEqual(["A", "B"]);
  });
});
