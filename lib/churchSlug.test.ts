import {
  getTranslationListenPath,
  parseChurchSlug,
  withChurchSearchParam,
} from "@/lib/churchSlug";
import { describe, expect, it } from "vitest";

describe("church slug", () => {
  it("accepts lowercase church slugs", () => {
    expect(parseChurchSlug("pvccc")).toBe("pvccc");
    expect(parseChurchSlug("Example-Church")).toBe("example-church");
  });

  it("rejects empty or invalid slugs", () => {
    expect(parseChurchSlug("")).toBeNull();
    expect(parseChurchSlug("Not A Slug")).toBeNull();
    expect(parseChurchSlug("/listen")).toBeNull();
    expect(parseChurchSlug("a".repeat(65))).toBeNull();
  });

  it("builds church listen paths and API queries", () => {
    expect(getTranslationListenPath("pvccc")).toBe("/listen/pvccc");
    expect(
      withChurchSearchParam("/api/translation-audio?after=12", "pvccc")
    ).toBe("/api/translation-audio?after=12&church=pvccc");
  });
});
