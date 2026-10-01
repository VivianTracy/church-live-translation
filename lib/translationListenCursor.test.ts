import {
  liveListenCursor,
  nextListenCursor,
} from "@/lib/translationListenCursor";
import { describe, expect, it } from "vitest";

describe("listen playback cursor", () => {
  it("starts a couple of chunks behind live so the buffer can fill", () => {
    expect(liveListenCursor(20)).toBe(16);
    expect(liveListenCursor(2)).toBe(0);
  });

  it("jumps to live after a network gap instead of dumping old audio", () => {
    expect(nextListenCursor(10, 12)).toBe(10);
    expect(nextListenCursor(10, 40)).toBe(36);
  });
});
