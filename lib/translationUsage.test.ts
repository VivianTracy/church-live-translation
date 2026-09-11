import {
  formatSessionCount,
  summarizeTranslationUsage,
} from "@/lib/translationUsage";
import { describe, expect, it } from "vitest";

describe("church translation usage", () => {
  it("counts sessions for today and this month in the church timezone", () => {
    const summary = summarizeTranslationUsage(
      [
        { createdAt: "2026-09-10T12:00:00.000Z" },
        { createdAt: "2026-09-01T12:00:00.000Z" },
        { createdAt: "2026-08-31T12:00:00.000Z" },
      ],
      new Date("2026-09-10T16:00:00.000Z"),
      "America/New_York"
    );

    expect(summary.sessionsToday).toBe(1);
    expect(summary.sessionsThisMonth).toBe(2);
    expect(summary.lastStartedAt).toBe("2026-09-10T12:00:00.000Z");
  });

  it("keeps an older last-started time from a separate lookup", () => {
    const summary = summarizeTranslationUsage(
      [],
      new Date("2026-09-10T16:00:00.000Z"),
      "America/New_York",
      "2026-08-02T14:00:00.000Z"
    );

    expect(summary.sessionsToday).toBe(0);
    expect(summary.sessionsThisMonth).toBe(0);
    expect(summary.lastStartedAt).toBe("2026-08-02T14:00:00.000Z");
  });

  it("formats session counts", () => {
    expect(formatSessionCount(0)).toBe("0 sessions");
    expect(formatSessionCount(1)).toBe("1 session");
    expect(formatSessionCount(2)).toBe("2 sessions");
  });
});
