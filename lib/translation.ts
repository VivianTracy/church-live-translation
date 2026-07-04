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

export function formatTranslationError(error: TranslationError): string {
  const lines = [`HTTP ${error.status}: ${error.message}`];

  if (error.geminiResponse !== null && error.geminiResponse !== undefined) {
    lines.push(JSON.stringify(error.geminiResponse, null, 2));
  }

  return lines.join("\n");
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
