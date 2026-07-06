import {
  countChineseCharacters,
  joinSentences,
  splitChineseSentences,
  splitEnglishSentences,
} from "@/lib/chineseSentences";

export const SENTENCES_PER_BATCH = 2;
export const TAIL_SENTENCE_COUNT = 2;
export const REFINEMENT_WINDOW = 6;
export const MIN_CHARS_PER_BATCH = 28;
export const INTERIM_REFINE_DEBOUNCE_MS = 900;
export const INTERIM_MIN_OPEN_CHARS = 4;

type TranslationKind = "batch" | "refine";

type SentenceCaptionPipelineOptions = {
  sentencesPerBatch?: number;
  tailSentenceCount?: number;
  refinementWindow?: number;
  minCharsPerBatch?: number;
  interimDebounceMs?: number;
  onPublish: (caption: string) => void;
  onTranslationError?: (error: unknown) => void;
  translate: (chinese: string) => Promise<string>;
};

export function createSentenceCaptionPipeline({
  sentencesPerBatch = SENTENCES_PER_BATCH,
  tailSentenceCount = TAIL_SENTENCE_COUNT,
  refinementWindow = REFINEMENT_WINDOW,
  minCharsPerBatch = MIN_CHARS_PER_BATCH,
  interimDebounceMs = INTERIM_REFINE_DEBOUNCE_MS,
  onPublish,
  onTranslationError,
  translate,
}: SentenceCaptionPipelineOptions) {
  const chineseSentences: string[] = [];
  let committedChineseCount = 0;
  let finalizedTranscript = "";
  let stableEnglishSentences: string[] = [];
  let tailEnglishSentences: string[] = [];

  let interimTimer: ReturnType<typeof setTimeout> | null = null;
  let translationQueue = Promise.resolve();
  let activeRequestId = 0;
  let lastRefinedOpenText = "";

  const publishCaption = () => {
    const caption = joinSentences([
      ...stableEnglishSentences,
      ...tailEnglishSentences,
    ]);

    if (caption) {
      onPublish(caption);
    }
  };

  const applyBatchTranslation = (english: string) => {
    const englishParts = splitEnglishSentences(english);

    if (englishParts.length >= tailSentenceCount + 1) {
      stableEnglishSentences.push(
        ...englishParts.slice(0, englishParts.length - tailSentenceCount)
      );
      tailEnglishSentences = englishParts.slice(-tailSentenceCount);
    } else if (englishParts.length > 0) {
      tailEnglishSentences = englishParts.slice(-tailSentenceCount);
    }

    publishCaption();
  };

  const applyRefinementTranslation = (english: string) => {
    const englishParts = splitEnglishSentences(english);

    if (englishParts.length === 0) {
      return;
    }

    tailEnglishSentences = englishParts.slice(-tailSentenceCount);
    publishCaption();
  };

  const enqueueTranslation = (
    chinese: string,
    kind: TranslationKind
  ): Promise<void> => {
    const requestId = ++activeRequestId;

    translationQueue = translationQueue
      .then(async () => {
        const english = await translate(chinese);

        if (requestId !== activeRequestId) {
          return;
        }

        if (kind === "batch") {
          applyBatchTranslation(english);
        } else {
          applyRefinementTranslation(english);
        }
      })
      .catch((error) => {
        console.error("Sentence caption translation failed:", error);
        onTranslationError?.(error);
      });

    return translationQueue;
  };

  const getPendingSegments = () =>
    chineseSentences.slice(committedChineseCount);

  const getPendingCharCount = () =>
    countChineseCharacters(joinSentences(getPendingSegments()));

  const commitBatch = (batch: string[]) => {
    if (batch.length === 0) {
      return;
    }

    committedChineseCount += batch.length;
    lastRefinedOpenText = "";
    void enqueueTranslation(joinSentences(batch), "batch");
  };

  const maybeCommitBatch = () => {
    while (true) {
      const pending = getPendingSegments();

      if (pending.length >= sentencesPerBatch) {
        commitBatch(pending.slice(0, sentencesPerBatch));
        continue;
      }

      const pendingChars = getPendingCharCount();

      if (pending.length >= 1 && pendingChars >= minCharsPerBatch) {
        commitBatch(pending);
        continue;
      }

      break;
    }
  };

  const scheduleInterimRefinement = (displayText: string) => {
    if (interimTimer) {
      clearTimeout(interimTimer);
    }

    interimTimer = setTimeout(() => {
      interimTimer = null;

      const openText = displayText.startsWith(finalizedTranscript)
        ? displayText.slice(finalizedTranscript.length).trim()
        : displayText.trim();

      if (openText.length < INTERIM_MIN_OPEN_CHARS) {
        return;
      }

      if (openText === lastRefinedOpenText) {
        return;
      }

      if (openText.length < lastRefinedOpenText.length) {
        lastRefinedOpenText = "";
      }

      const pendingCount = chineseSentences.length - committedChineseCount;

      if (pendingCount >= sentencesPerBatch) {
        return;
      }

      lastRefinedOpenText = openText;
      void enqueueTranslation(openText, "refine");
    }, interimDebounceMs);
  };

  return {
    addFinalTranscript(text: string) {
      const cleanText = text.trim();

      if (!cleanText) {
        return;
      }

      finalizedTranscript = finalizedTranscript
        ? `${finalizedTranscript} ${cleanText}`
        : cleanText;
      chineseSentences.push(...splitChineseSentences(cleanText));
      maybeCommitBatch();
    },

    addInterimTranscript(displayText: string) {
      scheduleInterimRefinement(displayText);
    },

    reset() {
      chineseSentences.length = 0;
      committedChineseCount = 0;
      finalizedTranscript = "";
      stableEnglishSentences = [];
      tailEnglishSentences = [];
      lastRefinedOpenText = "";

      if (interimTimer) {
        clearTimeout(interimTimer);
        interimTimer = null;
      }

      activeRequestId += 1;
      translationQueue = Promise.resolve();
    },

    getCaption() {
      return joinSentences([
        ...stableEnglishSentences,
        ...tailEnglishSentences,
      ]);
    },
  };
}
