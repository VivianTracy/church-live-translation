import { startOfZonedDay, startOfZonedMonth } from "@/lib/zonedTime";
import { describe, expect, it } from "vitest";

describe("zoned time bounds", () => {
  it("finds midnight in America/New_York", () => {
    expect(
      startOfZonedDay(
        new Date("2026-09-10T12:00:00.000Z"),
        "America/New_York"
      ).toISOString()
    ).toBe("2026-09-10T04:00:00.000Z");
  });

  it("finds the first of the month in America/New_York", () => {
    expect(
      startOfZonedMonth(
        new Date("2026-09-10T12:00:00.000Z"),
        "America/New_York"
      ).toISOString()
    ).toBe("2026-09-01T04:00:00.000Z");
  });
});
