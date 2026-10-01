import {
  getListenRedisToken,
  getListenRedisUrl,
  hasListenRedisEnv,
} from "@/lib/listenRedisEnv";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("listen Redis env", () => {
  it("prefers Upstash console names over leftover KV names", () => {
    vi.stubEnv(
      "UPSTASH_REDIS_REST_URL",
      "https://good-example.upstash.io"
    );
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", '"quoted-token"');
    vi.stubEnv("KV_REST_API_URL", "https://old-broken.upstash.io");
    vi.stubEnv("KV_REST_API_TOKEN", "old-token");

    expect(getListenRedisUrl()).toBe("https://good-example.upstash.io");
    expect(getListenRedisToken()).toBe("quoted-token");
    expect(hasListenRedisEnv()).toBe(true);
  });

  it("falls back to Vercel KV names", () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("KV_REST_API_URL", "https://example.upstash.io");
    vi.stubEnv("KV_REST_API_TOKEN", "token");

    expect(hasListenRedisEnv()).toBe(true);
  });

  it("is unset when the token is missing", () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("KV_REST_API_URL", "");
    vi.stubEnv("KV_REST_API_TOKEN", "");

    expect(hasListenRedisEnv()).toBe(false);
  });
});
