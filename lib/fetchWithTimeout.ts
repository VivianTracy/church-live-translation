export async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  timeoutMs = 5000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const abortFromCaller = () => controller.abort();
  init.signal?.addEventListener("abort", abortFromCaller);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("Could not reach translation service.");
    }

    throw error instanceof Error
      ? error
      : new Error("Could not reach translation service.");
  } finally {
    clearTimeout(timeoutId);
    init.signal?.removeEventListener("abort", abortFromCaller);
  }
}
