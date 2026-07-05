/** Strong sentence endings from written Chinese or occasional STT punctuation. */
const STRONG_BREAK = /(?<=[。！？；])/;

/** Clause breaks common in spoken Chinese STT output. */
const CLAUSE_BREAK = /(?<=[，、])/;

/** Target caption segment size when STT sends unpunctuated runs. */
export const MAX_SEGMENT_CHARS = 14;
export const MIN_SEGMENT_CHARS = 6;

export function splitChineseSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, "").trim();

  if (!normalized) {
    return [];
  }

  const segments: string[] = [];

  for (const strongPart of normalized.split(STRONG_BREAK)) {
    const part = strongPart.trim();

    if (!part) {
      continue;
    }

    for (const clause of part.split(CLAUSE_BREAK)) {
      const trimmed = clause.trim();

      if (!trimmed) {
        continue;
      }

      segments.push(...chunkLongSegment(trimmed));
    }
  }

  return segments;
}

function chunkLongSegment(text: string): string[] {
  if (text.length <= MAX_SEGMENT_CHARS) {
    return [text];
  }

  const chunks: string[] = [];
  let index = 0;

  while (index < text.length) {
    let end = Math.min(index + MAX_SEGMENT_CHARS, text.length);

    if (end < text.length) {
      const slice = text.slice(index, end);
      const commaBreak = Math.max(
        slice.lastIndexOf("，"),
        slice.lastIndexOf("、"),
        slice.lastIndexOf(" ")
      );

      if (commaBreak >= MIN_SEGMENT_CHARS) {
        end = index + commaBreak + 1;
      }
    }

    const chunk = text.slice(index, end).trim();

    if (chunk) {
      chunks.push(chunk);
    }

    index = end;
  }

  return chunks;
}

const ENGLISH_SENTENCE_END = /(?<=[.!?])\s+/;

export function splitEnglishSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return [];
  }

  const parts = normalized
    .split(ENGLISH_SENTENCE_END)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length > 1) {
    return parts;
  }

  return chunkEnglishSegment(normalized);
}

function chunkEnglishSegment(text: string, maxWords = 18): string[] {
  const words = text.split(/\s+/);

  if (words.length <= maxWords) {
    return [text];
  }

  const chunks: string[] = [];

  for (let index = 0; index < words.length; index += maxWords) {
    chunks.push(words.slice(index, index + maxWords).join(" "));
  }

  return chunks;
}

export function countChineseCharacters(text: string): number {
  return text.replace(/\s+/g, "").length;
}

export function joinSentences(sentences: string[]): string {
  return sentences.filter(Boolean).join(" ").trim();
}
