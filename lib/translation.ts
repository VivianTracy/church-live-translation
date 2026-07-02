/**
 * Translates Chinese text into English.
 *
 * This is the single entry point for all translation.
 * Today it simply returns the original Chinese text.
 * Later it will call Gemini, GPT, or another AI model.
 */
export async function translateChineseToEnglish(
  chinese: string
): Promise<string> {
  return chinese;
}