export class TranslationError extends Error {
  readonly status: number;
  readonly geminiResponse: unknown;

  constructor(message: string, status: number, geminiResponse: unknown) {
    super(message);
    this.name = "TranslationError";
    this.status = status;
    this.geminiResponse = geminiResponse;
  }
}

export function isTranslationError(error: unknown): error is TranslationError {
  return error instanceof Error && error.name === "TranslationError";
}

export function formatTranslationError(error: TranslationError): string {
  const geminiMessage = extractGeminiMessage(error.geminiResponse);

  if (error.status === 429) {
    return `Gemini quota exceeded (HTTP 429). ${geminiMessage || error.message}\n\nCheck usage at https://aistudio.google.com/ or wait and retry.`;
  }

  if (geminiMessage) {
    return `HTTP ${error.status}: ${geminiMessage}`;
  }

  return `HTTP ${error.status}: ${error.message}`;
}

function extractGeminiMessage(geminiResponse: unknown): string | null {
  if (!geminiResponse || typeof geminiResponse !== "object") {
    return null;
  }

  const response = geminiResponse as {
    error?: { message?: string };
  };

  return response.error?.message?.trim() || null;
}

export async function translateChineseToEnglish(
  chinese: string
): Promise<string> {
  const response = await fetch("/api/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: chinese }),
  });

  let data: {
    translation?: string;
    error?: string;
    geminiResponse?: unknown;
  };

  try {
    data = await response.json();
  } catch {
    throw new TranslationError(
      `Translation API returned non-JSON response (${response.status} ${response.statusText})`,
      response.status,
      null
    );
  }

  if (!response.ok) {
    console.error("Translation API error:", data);
    throw new TranslationError(
      data.error || `Translation API error (${response.status})`,
      response.status,
      data.geminiResponse ?? null
    );
  }

  if (!data.translation) {
    throw new TranslationError(
      "Translation API returned an empty translation",
      response.status,
      data
    );
  }

  return data.translation;
}
