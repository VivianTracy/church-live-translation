import {
  describeOutputTestFailure,
  playOutputTestTone,
} from "@/lib/audioOutputTest";
import { describe, expect, it } from "vitest";

describe("output test tone", () => {
  it("asks for more volume instead of playing a silent test", async () => {
    await expect(playOutputTestTone({ deviceId: "earpiece", volume: 0 })).resolves.toBe(
      "Turn the output volume up, then test again."
    );
  });

  it("explains a missing output in plain language", () => {
    expect(describeOutputTestFailure(new DOMException("gone", "NotFoundError"))).toBe(
      "That output is not available. Refresh the list and choose it again."
    );
    expect(describeOutputTestFailure(new DOMException("blocked", "NotAllowedError"))).toBe(
      "The browser blocked the test sound. Click Test sound again."
    );
  });
});
