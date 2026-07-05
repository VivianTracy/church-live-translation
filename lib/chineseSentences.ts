const CHINESE_SENTENCE_END = /(?<=[。！？；])/;

const ENGLISH_SENTENCE_END = /(?<=[.!?])\s+/;

export function splitChineseSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return [];
  }

  return normalized
    .split(CHINESE_SENTENCE_END)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function splitEnglishSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return [];
  }

  const parts = normalized
    .split(ENGLISH_SENTENCE_END)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return [normalized];
  }

  return parts;
}

export function joinSentences(sentences: string[]): string {
  return sentences.filter(Boolean).join(" ").trim();
}
