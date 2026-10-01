import {
  CHURCH_REGISTER_RATE_LIMIT_MAX_PER_IP,
  consumeChurchRegisterRateLimit,
  getClientIp,
  resetChurchRegisterRateLimitMemory,
} from "@/lib/churchRegisterRateLimit";
import { afterEach, describe, expect, it } from "vitest";

afterEach(() => {
  resetChurchRegisterRateLimitMemory();
});

describe("church register rate limit", () => {
  it("reads the first forwarded IP", () => {
    expect(
      getClientIp(
        new Request("http://localhost/api/church-register", {
          headers: { "x-forwarded-for": "203.0.113.4, 10.0.0.1" },
        })
      )
    ).toBe("203.0.113.4");
  });

  it("allows a few attempts from one IP then blocks", async () => {
    for (let index = 0; index < CHURCH_REGISTER_RATE_LIMIT_MAX_PER_IP; index += 1) {
      expect(await consumeChurchRegisterRateLimit("203.0.113.8")).toEqual({
        allowed: true,
      });
    }

    const blocked = await consumeChurchRegisterRateLimit("203.0.113.8");
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    }

    expect(await consumeChurchRegisterRateLimit("203.0.113.9")).toEqual({
      allowed: true,
    });
  });
});
