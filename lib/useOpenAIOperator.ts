"use client";

import { saveCaptionState } from "@/lib/captionApi";
import { connectOpenAITranscription } from "@/lib/openaiTranscriptionClient";
import type { WhisperMonitorSnapshot } from "@/lib/openaiTranscriptionMonitor";
import {
  OpenAITranslationError,
  translateChineseToEnglishOpenAI,
} from "@/lib/openaiTranslate";
import { useEffect, useRef, useState } from "react";

export function useOpenAIOperator() {
  const [isListening, setIsListening] = useState(false);
  const [micTranscript, setMicTranscript] = useState("");
  const [englishCaption, setEnglishCaption] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState("");
  const [micError, setMicError] = useState("");
  const [lastTranslationMs, setLastTranslationMs] = useState<number | null>(
    null
  );
  const [segmentCount, setSegmentCount] = useState(0);
  const [transcribedSegmentCount, setTranscribedSegmentCount] = useState(0);
  const [whisperStatus, setWhisperStatus] =
    useState<WhisperMonitorSnapshot | null>(null);

  const transcriptionRef = useRef<Awaited<
    ReturnType<typeof connectOpenAITranscription>
  > | null>(null);
  const englishPartsRef = useRef<string[]>([]);
  const translationQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    return () => {
      transcriptionRef.current?.stop();
      transcriptionRef.current = null;
    };
  }, []);

  const resetSession = () => {
    englishPartsRef.current = [];
    translationQueueRef.current = Promise.resolve();
    setMicTranscript("");
    setEnglishCaption("");
    setSegmentCount(0);
    setTranscribedSegmentCount(0);
    setWhisperStatus(null);
  };

  const handleTranscribedSegment = (chinese: string) => {
    setTranscribedSegmentCount((count) => count + 1);
    translateSegment(chinese);
  };

  const translateSegment = (chinese: string) => {
    translationQueueRef.current = translationQueueRef.current
      .then(async () => {
        const startedAt = Date.now();
        setIsTranslating(true);

        try {
          const english = await translateChineseToEnglishOpenAI(chinese);
          englishPartsRef.current.push(english);
          const fullCaption = englishPartsRef.current.join(" ");
          setEnglishCaption(fullCaption);
          setLastTranslationMs(Date.now() - startedAt);
          setTranslationError("");
          setSegmentCount(englishPartsRef.current.length);

          await saveCaptionState({
            isLive: true,
            caption: fullCaption,
            updatedAt: Date.now(),
          });
        } catch (error) {
          const message =
            error instanceof OpenAITranslationError
              ? error.message
              : error instanceof Error
                ? error.message
                : String(error);
          setTranslationError(message);
          throw error;
        } finally {
          setIsTranslating(false);
        }
      })
      .catch((error) => {
        console.error("OpenAI caption translation failed:", error);
      });
  };

  const startMicrophone = async () => {
    setMicError("");
    setTranslationError("");
    resetSession();

    try {
      transcriptionRef.current?.stop();

      transcriptionRef.current = await connectOpenAITranscription({
        onDisplay: setMicTranscript,
        onSegment: handleTranscribedSegment,
        onListeningChange: setIsListening,
        onError: (message) => {
          setMicError(message);
          setIsListening(false);
        },
        onMonitorUpdate: setWhisperStatus,
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
    translationStatusLabel:
      "OpenAI gpt-4o-mini-transcribe (REST chunks) + GPT-4o mini",
    isListening,
    micTranscript,
    englishCaption,
    isTranslating,
    translationError,
    micError,
    lastTranslationMs,
    segmentCount,
    transcribedSegmentCount,
    whisperStatus,
    startMicrophone,
    stopMicrophone,
  };
}
