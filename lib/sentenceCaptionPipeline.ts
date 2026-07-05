import {
  joinSentences,
  splitChineseSentences,
  splitEnglishSentences,
} from "@/lib/chineseSentences";

export const SENTENCES_PER_BATCH = 3;
export const TAIL_SENTENCE_COUNT = 2;
export const REFINEMENT_WINDOW = 5;
export const REFINEMENT_DEBOUNCE_MS = 700;

type TranslationKind = "batch" | "refine";

type SentenceCaptionPipelineOptions = {
  sentencesPerBatch?: number;
  tailSentenceCount?: number;
  refinementWindow?: number;
  refinementDebounceMs?: number;
  onPublish: (caption: string) => void;
  translate: (chinese: string) => Promise<string>;
};

export function createSentenceCaptionPipeline({
  sentencesPerBatch = SENTENCES_PER_BATCH,
  tailSentenceCount = TAIL_SENTENCE_COUNT,
  refinementWindow = REFINEMENT_WINDOW,
  refinementDebounceMs = REFINEMENT_DEBOUNCE_MS,
  onPublish,
  translate,
}: SentenceCaptionPipelineOptions) {
  const chineseSentences: string[] = [];
  let committedChineseCount = 0;
  let stableEnglishSentences: string[] = [];
  let tailEnglishSentences: string[] = [];

  let refinementTimer: ReturnType<typeof setTimeout> | null = null;
  let translationQueue = Promise.resolve();
  let activeRequestId = 0;

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
      });

    return translationQueue;
  };

  const scheduleRefinement = () => {
    if (refinementTimer) {
      clearTimeout(refinementTimer);
    }

    refinementTimer = setTimeout(() => {
      refinementTimer = null;

      const pendingCount = chineseSentences.length - committedChineseCount;

      if (pendingCount <= 0) {
        return;
      }

      if (pendingCount >= sentencesPerBatch) {
        return;
      }

      const windowStart = Math.max(
        0,
        chineseSentences.length - refinementWindow
      );
      const chinese = joinSentences(chineseSentences.slice(windowStart));

      if (!chinese) {
        return;
      }

      void enqueueTranslation(chinese, "refine");
    }, refinementDebounceMs);
  };

  const maybeCommitBatch = () => {
    while (chineseSentences.length - committedChineseCount >= sentencesPerBatch) {
      const batch = chineseSentences.slice(
        committedChineseCount,
        committedChineseCount + sentencesPerBatch
      );
      committedChineseCount += sentencesPerBatch;

      void enqueueTranslation(joinSentences(batch), "batch");
    }
  };

  return {
    addFinalTranscript(text: string) {
      const sentences = splitChineseSentences(text);

      if (sentences.length === 0) {
        return;
      }

      chineseSentences.push(...sentences);
      maybeCommitBatch();
      scheduleRefinement();
    },

    reset() {
      chineseSentences.length = 0;
      committedChineseCount = 0;
      stableEnglishSentences = [];
      tailEnglishSentences = [];

      if (refinementTimer) {
        clearTimeout(refinementTimer);
        refinementTimer = null;
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
