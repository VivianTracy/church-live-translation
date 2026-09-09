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
  it("reads Vercel KV names", () => {
    vi.stubEnv("KV_REST_API_URL", "https://example.upstash.io");
    vi.stubEnv("KV_REST_API_TOKEN", "token");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

    expect(getListenRedisUrl()).toBe("https://example.upstash.io");
    expect(getListenRedisToken()).toBe("token");
    expect(hasListenRedisEnv()).toBe(true);
  });

  it("falls back to Upstash console names", () => {
    vi.stubEnv("KV_REST_API_URL", "");
    vi.stubEnv("KV_REST_API_TOKEN", "");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");

    expect(hasListenRedisEnv()).toBe(true);
  });

  it("is unset when the token is missing", () => {
    vi.stubEnv("KV_REST_API_URL", "https://example.upstash.io");
    vi.stubEnv("KV_REST_API_TOKEN", "");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

    expect(hasListenRedisEnv()).toBe(false);
  });
});
