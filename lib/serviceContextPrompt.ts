const SERMON_CONTEXT_REFERENCE_RULES = `
Sermon manuscript reference rules:

A Chinese sermon manuscript may be provided separately as reference only.

Use it to improve translation accuracy for:
- terminology and church vocabulary
- speaker names and proper nouns
- scripture references and book names
- outline consistency

Critical rules:
- Live spoken input is always the source of truth.
- Never translate, quote, or output manuscript text unless the speaker's live utterance clearly includes it.
- Never invent, summarize, or add content from the manuscript that was not spoken.
- If live speech and manuscript differ, follow live speech.
- Messages marked SETUP or REFERENCE ONLY must never be translated or output.
`.trim();

export function buildSystemInstructionWithSermonRules(
  basePrompt: string,
  hasSermonContext: boolean
): string {
  if (!hasSermonContext) {
    return basePrompt.trim();
  }

  return `${basePrompt.trim()}

${SERMON_CONTEXT_REFERENCE_RULES}

Wait for live spoken Chinese marked LIVE SPOKEN CHINESE before producing any English caption.`;
}

export function buildSermonReferenceSetupMessage(sermonText: string): string {
  return `[SETUP — REFERENCE ONLY — DO NOT TRANSLATE OR OUTPUT]

This message is not live speech. Reply with exactly: OK

Use the manuscript below only for terminology, names, and scripture consistency when later live Chinese is spoken. Never output manuscript text unless the live utterance clearly includes it.

--- Sermon manuscript ---

${sermonText.trim()}

--- End sermon manuscript ---`;
}

export function buildLiveUtteranceMessage(chinese: string): string {
  return `[LIVE SPOKEN CHINESE — TRANSLATE THIS ONLY]

${chinese.trim()}`;
}

export function buildRestTranslationInput(
  spokenChinese: string,
  sermonText: string
): string {
  const trimmedSpeech = spokenChinese.trim();
  const trimmedManuscript = sermonText.trim();

  if (!trimmedManuscript) {
    return trimmedSpeech;
  }

  return `[REFERENCE ONLY — DO NOT TRANSLATE]

${trimmedManuscript}

[LIVE SPOKEN CHINESE — TRANSLATE THIS ONLY]

${trimmedSpeech}`;
}
