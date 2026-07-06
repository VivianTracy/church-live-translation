/** Chat model for Chinese → English captions (reliable text translation). */
export const OPENAI_CHAT_TRANSLATION_MODEL = "gpt-4o-mini";

export class OpenAITranslationError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OpenAITranslationError";
    this.status = status;
  }
}

export async function translateChineseToEnglishOpenAI(
  chinese: string
): Promise<string> {
  const response = await fetch("/api/openai/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: chinese }),
  });

  let data: {
    translation?: string;
    error?: string;
  };

  try {
    data = await response.json();
  } catch {
    throw new OpenAITranslationError(
      `OpenAI translate API returned non-JSON (${response.status})`,
      response.status
    );
  }

  if (!response.ok || !data.translation) {
    throw new OpenAITranslationError(
      data.error ?? `OpenAI translate API error (${response.status})`,
      response.status
    );
  }

  return data.translation;
}
