import { getTranslationListenUrl } from "@/lib/audienceUrl";
import {
  getTranslationRelayApiUrl,
  isLocalDevHostname,
} from "@/lib/translationRelayUrl";
import { isTranslationSessionLive } from "@/types/translationListen";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("audience listen URL", () => {
  it("uses NEXT_PUBLIC_AUDIENCE_URL for the permanent /listen QR", () => {
    vi.stubEnv("NEXT_PUBLIC_AUDIENCE_URL", "https://church-caption.vercel.app/");

    expect(getTranslationListenUrl("http://localhost:3000")).toBe(
      "https://church-caption.vercel.app/listen"
    );
  });

  it("falls back to the current origin when no audience URL is set", () => {
    vi.stubEnv("NEXT_PUBLIC_AUDIENCE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_RELAY_URL", "");

    expect(getTranslationListenUrl("http://localhost:3000")).toBe(
      "http://localhost:3000/listen"
    );
  });

  it("sends operator relay calls to the deployed audience URL", () => {
    vi.stubEnv("NEXT_PUBLIC_AUDIENCE_URL", "https://church-caption.vercel.app");

    expect(getTranslationRelayApiUrl("/api/translation-listen-state")).toBe(
      "https://church-caption.vercel.app/api/translation-listen-state"
    );
  });

  it("treats localhost hostnames as local operator", () => {
    expect(isLocalDevHostname("localhost")).toBe(true);
    expect(isLocalDevHostname("church-caption.vercel.app")).toBe(false);
  });
});

describe("listen live detection", () => {
  it("treats active audio chunks as live", () => {
    expect(
      isTranslationSessionLive(
        { isLive: false, updatedAt: 0 },
        { isLive: false, updatedAt: 1, latestSeq: 4, mimeType: "audio/wav" }
      )
    ).toBe(true);
  });
});
