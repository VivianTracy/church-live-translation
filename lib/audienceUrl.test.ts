import { getTranslationListenUrl } from "@/lib/audienceUrl";
import { shouldProxyTranslationRelay } from "@/lib/translationRelayProxy";
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
  it("uses NEXT_PUBLIC_AUDIENCE_URL for the permanent church QR", () => {
    vi.stubEnv("NEXT_PUBLIC_AUDIENCE_URL", "https://church-translate.vercel.app/");

    expect(getTranslationListenUrl("http://localhost:3000", "pvccc")).toBe(
      "https://church-translate.vercel.app/listen/pvccc"
    );
  });

  it("falls back to the current origin when no audience URL is set", () => {
    vi.stubEnv("NEXT_PUBLIC_AUDIENCE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_RELAY_URL", "");

    expect(getTranslationListenUrl("http://localhost:3000", "pvccc")).toBe(
      "http://localhost:3000/listen/pvccc"
    );
  });

  it("keeps operator relay calls on the same origin", () => {
    vi.stubEnv("NEXT_PUBLIC_AUDIENCE_URL", "https://church-translate.vercel.app");

    expect(getTranslationRelayApiUrl("/api/translation-listen-state")).toBe(
      "/api/translation-listen-state"
    );
  });

  it("proxies the church computer to the deployed phone page", () => {
    vi.stubEnv("NEXT_PUBLIC_AUDIENCE_URL", "https://church-translate.vercel.app");

    expect(
      shouldProxyTranslationRelay(
        new Request("http://127.0.0.1:3000/api/translation-listen-state")
      )
    ).toBe(true);
    expect(
      shouldProxyTranslationRelay(
        new Request("https://church-translate.vercel.app/api/translation-listen-state")
      )
    ).toBe(false);
    expect(
      shouldProxyTranslationRelay(
        new Request("http://127.0.0.1:3000/api/translation-listen-state", {
          headers: { "x-translation-relay-proxy": "1" },
        })
      )
    ).toBe(false);
  });

  it("treats localhost hostnames as local operator", () => {
    expect(isLocalDevHostname("localhost")).toBe(true);
    expect(isLocalDevHostname("church-translate.vercel.app")).toBe(false);
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
