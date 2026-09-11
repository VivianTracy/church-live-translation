import {
  isSessionCreateAllowed,
  SESSION_RATE_LIMIT_MAX_PER_CHURCH,
  consumeTranslationSessionRateLimit,
  resetTranslationSessionRateLimitMemory,
} from "@/lib/translationSessionRateLimit";
import { afterEach, describe, expect, it } from "vitest";

afterEach(() => {
  resetTranslationSessionRateLimitMemory();
});

describe("translation session rate limit", () => {
  it("allows session creates at the limit", () => {
    expect(isSessionCreateAllowed(8, SESSION_RATE_LIMIT_MAX_PER_CHURCH)).toBe(
      true
    );
    expect(isSessionCreateAllowed(9, SESSION_RATE_LIMIT_MAX_PER_CHURCH)).toBe(
      false
    );
  });

  it("blocks a church after too many session creates", async () => {
    for (let index = 0; index < SESSION_RATE_LIMIT_MAX_PER_CHURCH; index += 1) {
      const result = await consumeTranslationSessionRateLimit({
        churchId: "church-1",
        userId: `user-${index}`,
      });
      expect(result.allowed).toBe(true);
    }

    const blocked = await consumeTranslationSessionRateLimit({
      churchId: "church-1",
      userId: "user-last",
    });

    expect(blocked).toMatchObject({ allowed: false });
  });
});
