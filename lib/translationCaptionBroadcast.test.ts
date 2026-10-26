import {
  clearTranslationCaptions,
  createTranslationCaptionPublisher,
  resetCaptionRevisionClockForTests,
} from "@/lib/translationCaptionBroadcast";
import { afterEach, describe, expect, it, vi } from "vitest";

function postedBody(fetchMock: ReturnType<typeof vi.fn>): {
  clear?: boolean;
  track?: string;
  text?: string;
  final?: boolean;
  languageLabel?: string;
  languageCode?: string;
} {
  const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit] | undefined)?.[1];
  return JSON.parse(String(init?.body)) as {
    clear?: boolean;
    track?: string;
    text?: string;
    final?: boolean;
    languageLabel?: string;
    languageCode?: string;
  };
}

describe("caption relay posts", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    resetCaptionRevisionClockForTests();
  });

  it("returns before the in-progress caption is uploaded", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ success: true }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const publisher = createTranslationCaptionPublisher({
      churchSlug: "pvccc",
      getLanguage: () => ({ label: "English", code: "en" }),
      onError: () => undefined,
    });

    const result = publisher.append("original", "Hello");

    expect(result).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(400);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/translation-captions?church=pvccc"),
      expect.objectContaining({ method: "POST" })
    );
    expect(postedBody(fetchMock)).toMatchObject({
      track: "original",
      text: "Hello",
      final: false,
      languageLabel: "English",
      languageCode: "en",
    });
  });

  it("sends a session clear without waiting on the caller", async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ success: true }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await clearTranslationCaptions("pvccc");

    expect(postedBody(fetchMock)).toMatchObject({ clear: true });
  });
});
