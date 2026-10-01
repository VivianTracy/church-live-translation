import {
  formatMinutes,
  isSessionEventId,
  normalizeDurationSeconds,
  summarizeTranslationUsage,
} from "@/lib/translationUsage";
import { describe, expect, it } from "vitest";

describe("church translation usage", () => {
  it("sums recorded minutes for today and this month", () => {
    const summary = summarizeTranslationUsage(
      [
        { createdAt: "2026-09-10T12:00:00.000Z", durationSeconds: 1800 },
        { createdAt: "2026-09-01T12:00:00.000Z", durationSeconds: 600 },
        { createdAt: "2026-08-31T12:00:00.000Z", durationSeconds: 3600 },
        { createdAt: "2026-09-10T13:00:00.000Z", durationSeconds: null },
      ],
      new Date("2026-09-10T16:00:00.000Z"),
      "America/New_York"
    );

    expect(summary.minutesToday).toBe(30);
    expect(summary.minutesThisMonth).toBe(40);
    expect(summary.lastStartedAt).toBe("2026-09-10T13:00:00.000Z");
  });

  it("ignores older starts that have no duration", () => {
    const summary = summarizeTranslationUsage(
      [],
      new Date("2026-09-10T16:00:00.000Z"),
      "America/New_York",
      "2026-08-02T14:00:00.000Z"
    );

    expect(summary.minutesToday).toBe(0);
    expect(summary.minutesThisMonth).toBe(0);
    expect(summary.lastStartedAt).toBe("2026-08-02T14:00:00.000Z");
  });

  it("formats minute totals", () => {
    expect(formatMinutes(0)).toBe("0 min");
    expect(formatMinutes(1)).toBe("1 min");
    expect(formatMinutes(12)).toBe("12 min");
    expect(formatMinutes(60)).toBe("1 hr");
    expect(formatMinutes(75)).toBe("1 hr 15 min");
  });

  it("accepts a session duration in seconds", () => {
    expect(normalizeDurationSeconds(90.4)).toBe(90);
    expect(normalizeDurationSeconds(-1)).toBeNull();
    expect(normalizeDurationSeconds(90_000)).toBeNull();
    expect(
      isSessionEventId("2f1b7c3a-4d5e-4a67-8b9c-0d1e2f3a4b5c")
    ).toBe(true);
    expect(isSessionEventId("not-an-id")).toBe(false);
  });
});
