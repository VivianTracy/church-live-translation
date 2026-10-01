import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("fetchWithTimeout", () => {
  it("aborts hung requests so listen polling can retry", async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_input, init) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("Aborted");
            error.name = "AbortError";
            reject(error);
          });
        })
    );

    const pending = fetchWithTimeout("/api/translation-audio", {}, 1000);
    const expectation = expect(pending).rejects.toThrow(
      "Could not reach translation service."
    );
    await vi.advanceTimersByTimeAsync(1000);
    await expectation;
  });
});
