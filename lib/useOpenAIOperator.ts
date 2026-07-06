"use client";

import { saveCaptionState } from "@/lib/captionApi";
import { connectOpenAITranscription } from "@/lib/openaiTranscriptionClient";
import { connectOpenAITranslation } from "@/lib/openaiTranslationClient";
import { createSentenceCaptionPipeline } from "@/lib/sentenceCaptionPipeline";
import { useEffect, useRef, useState } from "react";

export function useOpenAIOperator(translationSessionVersion = 0) {
  const [isListening, setIsListening] = useState(false);
  const [micTranscript, setMicTranscript] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState("");
  const [micError, setMicError] = useState("");
  const [lastTranslationMs, setLastTranslationMs] = useState<number | null>(
    null
  );
  const [liveCaption, setLiveCaption] = useState("");

  const transcriptionRef = useRef<Awaited<
    ReturnType<typeof connectOpenAITranscription>
  > | null>(null);
  const translationRef = useRef<Awaited<
    ReturnType<typeof connectOpenAITranslation>
  > | null>(null);
  const pipelineRef = useRef<ReturnType<
    typeof createSentenceCaptionPipeline
  > | null>(null);

  useEffect(() => {
    let cancelled = false;

    pipelineRef.current = createSentenceCaptionPipeline({
      onPublish: (caption) => {
        setLiveCaption(caption);
        void saveCaptionState({
          isLive: true,
          caption,
          updatedAt: Date.now(),
        }).catch((error) => {
          console.error("Failed to save caption state:", error);
        });
      },
      translate: async (chinese) => {
        if (!translationRef.current) {
          throw new Error("OpenAI translation session is not ready.");
        }

        const startedAt = Date.now();
        setIsTranslating(true);

        try {
          const english = await translationRef.current.translateChinese(chinese);
          setLastTranslationMs(Date.now() - startedAt);
          setTranslationError("");
          return english;
        } finally {
          setIsTranslating(false);
        }
      },
    });

    connectOpenAITranslation({
      onCaptionDelta: (_delta, caption) => {
        setLiveCaption(caption);
      },
      onError: (message) => {
        setTranslationError(message);
      },
    })
      .then((session) => {
        if (cancelled) {
          session.close();
          return;
        }

        translationRef.current = session;
      })
      .catch((error) => {
        if (!cancelled) {
          setTranslationError(
            error instanceof Error ? error.message : String(error)
          );
        }
      });

    return () => {
      cancelled = true;
      transcriptionRef.current?.stop();
      transcriptionRef.current = null;
      translationRef.current?.close();
      translationRef.current = null;
      pipelineRef.current?.reset();
    };
  }, [translationSessionVersion]);

  const startMicrophone = async () => {
    setMicError("");
    setTranslationError("");

    try {
      transcriptionRef.current?.stop();

      transcriptionRef.current = await connectOpenAITranscription({
        onDelta: (_delta, displayText) => {
          setMicTranscript(displayText);
          pipelineRef.current?.addInterimTranscript(displayText);
        },
        onFinal: (transcript) => {
          pipelineRef.current?.addFinalTranscript(transcript);
        },
        onListeningChange: setIsListening,
        onError: (message) => {
          setMicError(message);
          setIsListening(false);
        },
      });

      setIsListening(true);
      return true;
    } catch (error) {
      setMicError(error instanceof Error ? error.message : String(error));
      setIsListening(false);
      return false;
    }
  };

  const stopMicrophone = () => {
    transcriptionRef.current?.stop();
    transcriptionRef.current = null;
    setIsListening(false);
  };

  return {
    translationStatusLabel: "OpenAI Whisper + GPT Realtime",
    isListening,
    micTranscript,
    isTranslating,
    translationError,
    micError,
    lastTranslationMs,
    liveCaption,
    startMicrophone,
    stopMicrophone,
  };
}
