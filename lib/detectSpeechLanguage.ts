export type DetectedSpeechLanguage = "zh" | "en";

const HAN_CHARACTER = /\p{Script=Han}/u;
const LATIN_LETTER = /[A-Za-z]/;

/** Enough Chinese characters to trust this is a Chinese sermon, not a title. */
const MIN_HAN_CHARACTERS = 4;

/**
 * Enough Latin letters to trust this is English speech.
 * Short words like Amen or John should not flip direction.
 */
const MIN_LATIN_LETTERS = 12;
const MIN_ENGLISH_WORDS = 3;
const MIN_LATIN_LETTERS_ALONE = 18;

export function countHanCharacters(text: string): number {
  let count = 0;

  for (const character of text) {
    if (HAN_CHARACTER.test(character)) {
      count += 1;
    }
  }

  return count;
}

export function countLatinLetters(text: string): number {
  let count = 0;

  for (const character of text) {
    if (LATIN_LETTER.test(character)) {
      count += 1;
    }
  }

  return count;
}

export function countEnglishWords(text: string): number {
  return text.split(/[^A-Za-z]+/).filter((word) => word.length >= 2).length;
}

/**
 * Decide Chinese vs English from live transcript text.
 * Returns null until there is enough of one script to be confident.
 */
export function detectSpeechLanguage(text: string): DetectedSpeechLanguage | null {
  const han = countHanCharacters(text);
  const latin = countLatinLetters(text);

  // Chinese sermons often include English names and Bible references.
  if (han >= MIN_HAN_CHARACTERS) {
    return "zh";
  }

  if (
    han === 0 &&
    (latin >= MIN_LATIN_LETTERS_ALONE ||
      (latin >= MIN_LATIN_LETTERS && countEnglishWords(text) >= MIN_ENGLISH_WORDS))
  ) {
    return "en";
  }

  return null;
}
