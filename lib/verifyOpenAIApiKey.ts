const OPENAI_MODELS_URL = "https://api.openai.com/v1/models";

export async function verifyOpenAIApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(OPENAI_MODELS_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    return response.ok;
  } catch {
    return false;
  }
}
