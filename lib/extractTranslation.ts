type TranslationPart = {
  text?: string;
  thought?: boolean;
};

type TranslationCandidate = {
  content?: {
    parts?: TranslationPart[];
  };
  finishReason?: string;
};

type TranslationResponse = {
  text?: string;
  candidates?: TranslationCandidate[];
  promptFeedback?: {
    blockReason?: string;
    blockReasonMessage?: string;
  };
};

export function extractTranslation(response: TranslationResponse): string | null {
  const directText = response.text?.trim();
  if (directText) {
    return directText;
  }

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((part) => !part.thought)
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  return text || null;
}

export function describeEmptyTranslation(response: TranslationResponse): string {
  const finishReason = response.candidates?.[0]?.finishReason;
  const blockReason = response.promptFeedback?.blockReason;
  const blockReasonMessage = response.promptFeedback?.blockReasonMessage;

  if (blockReason) {
    return `Translation blocked (${blockReason})${blockReasonMessage ? `: ${blockReasonMessage}` : ""}`;
  }

  if (finishReason) {
    return `Gemini returned no caption text (finishReason: ${finishReason})`;
  }

  return "Gemini returned no caption text";
}
