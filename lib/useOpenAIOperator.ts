"use client";

import { saveCaptionState } from "@/lib/captionApi";
import { connectOpenAITranscription } from "@/lib/openaiTranscriptionClient";
import type { WhisperMonitorSnapshot } from "@/lib/openaiTranscriptionMonitor";
import {
  OpenAITranslationError,
  translateChineseToEnglishOpenAI,
} from "@/lib/openaiTranslate";
import {
  appendSermonSegment,
  endSermonSession,
  loadSermonSession,
  pauseSermonSession,
  resumeSermonSession,
  startSermonSession,
} from "@/lib/sermonSessionApi";
import { loadStoredMicDeviceId, saveStoredMicDeviceId } from "@/lib/microphoneDeviceStorage";
import type { CaptionMode, SermonSession } from "@/types/sermonSession";
import { useCallback, useEffect, useRef, useState } from "react";

export function useOpenAIOperator() {
  const [mode, setModeState] = useState<CaptionMode>("others");
  const [sermonSession, setSermonSession] = useState<SermonSession | null>(
    null
  );
  const [isListening, setIsListening] = useState(false);
  const [micTranscript, setMicTranscript] = useState("");
  const [englishCaption, setEnglishCaption] = useState("");
  const [englishCaptionUpdatedAt, setEnglishCaptionUpdatedAt] = useState(0);
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
  const chinesePartsRef = useRef<string[]>([]);
  const translationQueueRef = useRef(Promise.resolve());
  const liveBroadcastRef = useRef(false);
  const micDeviceIdRef = useRef("");
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const sermonSessionRef = useRef(sermonSession);
  sermonSessionRef.current = sermonSession;

  const [micDeviceId, setMicDeviceIdState] = useState("");

  useEffect(() => {
    const storedDeviceId = loadStoredMicDeviceId();
    micDeviceIdRef.current = storedDeviceId;
    setMicDeviceIdState(storedDeviceId);
  }, []);

  useEffect(() => {
    loadSermonSession()
      .then(setSermonSession)
      .catch((error) => {
        console.error("Failed to load sermon session:", error);
      });
  }, []);

  useEffect(() => {
    return () => {
      transcriptionRef.current?.stop();
      transcriptionRef.current = null;
    };
  }, []);

  const resetCaptionState = () => {
    englishPartsRef.current = [];
    chinesePartsRef.current = [];
    translationQueueRef.current = Promise.resolve();
    setMicTranscript("");
    setEnglishCaption("");
    setEnglishCaptionUpdatedAt(0);
    setSegmentCount(0);
    setTranscribedSegmentCount(0);
    setWhisperStatus(null);
  };

  const stopMicCapture = () => {
    transcriptionRef.current?.stop();
    transcriptionRef.current = null;
    setIsListening(false);
  };

  const clearBroadcast = async () => {
    liveBroadcastRef.current = false;
    resetCaptionState();

    await saveCaptionState({
      isLive: false,
      caption: "",
      updatedAt: Date.now(),
    });
  };

  const startBroadcast = async () => {
    liveBroadcastRef.current = true;

    await saveCaptionState({
      isLive: true,
      caption: "",
      updatedAt: Date.now(),
    });
  };

  const setMode = useCallback(async (nextMode: CaptionMode) => {
    if (nextMode === modeRef.current) {
      return;
    }

    if (modeRef.current === "sermon" && nextMode === "others") {
      stopMicCapture();

      try {
        const session = sermonSessionRef.current;

        if (session?.status === "recording" || session?.status === "paused") {
          const ended = await endSermonSession();
          setSermonSession(ended ?? session);
        }

        await clearBroadcast();
      } catch (error) {
        console.error("Failed to end sermon session on mode change:", error);
      }
    }

    if (nextMode === "sermon" && modeRef.current === "others") {
      try {
        const session = await loadSermonSession();
        if (!session || session.status === "ended") {
          await clearBroadcast();
        }
      } catch (error) {
        console.error("Failed to prepare sermon mode:", error);
      }
    }

    setModeState(nextMode);
  }, []);

  const handleTranscribedSegment = (chinese: string) => {
    chinesePartsRef.current.push(chinese);
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
          setEnglishCaptionUpdatedAt(Date.now());
          setLastTranslationMs(Date.now() - startedAt);
          setTranslationError("");
          setSegmentCount(englishPartsRef.current.length);

          if (liveBroadcastRef.current) {
            await saveCaptionState({
              isLive: true,
              caption: fullCaption,
              updatedAt: Date.now(),
            });
          }

          if (modeRef.current === "sermon") {
            await appendSermonSegment(chinese, english);
          }
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

  const connectMicrophone = async (options: { preserveCaptions: boolean }) => {
    setMicError("");
    setTranslationError("");

    if (!options.preserveCaptions) {
      resetCaptionState();
    }

    try {
      transcriptionRef.current?.stop();

      transcriptionRef.current = await connectOpenAITranscription({
        initialSegments: options.preserveCaptions
          ? [...chinesePartsRef.current]
          : undefined,
        deviceId: micDeviceIdRef.current || undefined,
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

  const startMicrophone = async () => {
    const currentMode = modeRef.current;
    let session =
      currentMode === "sermon" ? await loadSermonSession() : sermonSession;

    if (currentMode === "sermon") {
      setSermonSession(session);
    }

    const pausedSermon =
      currentMode === "sermon" && session?.status === "paused";
    const activeSermon =
      currentMode === "sermon" &&
      session !== null &&
      session.status !== "ended";

    try {
      if (currentMode === "sermon") {
        if (pausedSermon) {
          session = await resumeSermonSession();
          setSermonSession(session);
          return connectMicrophone({ preserveCaptions: true });
        }

        if (!activeSermon) {
          session = await startSermonSession();
          setSermonSession(session);
          return connectMicrophone({ preserveCaptions: false });
        }

        return connectMicrophone({ preserveCaptions: true });
      }

      return connectMicrophone({ preserveCaptions: false });
    } catch (error) {
      setMicError(error instanceof Error ? error.message : String(error));
      return false;
    }
  };

  const stopMicrophone = () => {
    stopMicCapture();

    const session = sermonSessionRef.current;

    if (modeRef.current === "sermon" && session?.status === "recording") {
      pauseSermonSession()
        .then(setSermonSession)
        .catch((error) => {
          console.error("Failed to pause sermon session:", error);
        });
    }
  };

  const endSermon = async () => {
    stopMicCapture();

    try {
      const current = sermonSessionRef.current;
      let ended = current;

      if (current?.status === "recording" || current?.status === "paused") {
        ended = await endSermonSession();
      }

      setSermonSession(ended ?? current);
      await clearBroadcast();
    } catch (error) {
      console.error("Failed to end sermon session:", error);
      throw error;
    }
  };

  const setMicDeviceId = useCallback((deviceId: string) => {
    micDeviceIdRef.current = deviceId;
    setMicDeviceIdState(deviceId);
    saveStoredMicDeviceId(deviceId);
  }, []);

  return {
    mode,
    setMode,
    sermonSession,
    micDeviceId,
    setMicDeviceId,
    translationStatusLabel:
      "OpenAI gpt-4o-mini-transcribe (REST chunks) + GPT-4o mini",
    isListening,
    micTranscript,
    englishCaption,
    englishCaptionUpdatedAt,
    isTranslating,
    translationError,
    micError,
    lastTranslationMs,
    segmentCount,
    transcribedSegmentCount,
    whisperStatus,
    startMicrophone,
    stopMicrophone,
    endSermon,
    startBroadcast,
    clearBroadcast,
  };
}
