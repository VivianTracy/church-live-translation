"use client";

import { saveCaptionState } from "@/lib/captionApi";
import { connectGeminiLiveCaption } from "@/lib/geminiLiveCaption";
import {
  formatTranslationError,
  isTranslationError,
  translateChineseToEnglish,
} from "@/lib/translation";
import { createDesktopSpeechRecognition } from "@/lib/desktopSpeechRecognition";
import { createSpeechBuffer } from "@/lib/speechBuffer";
import { useEffect, useMemo, useRef, useState } from "react";

export type TranslationEngine = "checking" | "live" | "rest";

export function useGeminiLiveOperator() {
  const [translationEngine, setTranslationEngine] =
    useState<TranslationEngine>("checking");
  const [isListening, setIsListening] = useState(false);
  const [micTranscript, setMicTranscript] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState("");
  const [micError, setMicError] = useState("");
  const [lastTranslationMs, setLastTranslationMs] = useState<number | null>(
    null
  );
  const [liveCaption, setLiveCaption] = useState("");

  const liveSessionRef = useRef<Awaited<
    ReturnType<typeof connectGeminiLiveCaption>
  > | null>(null);
  const translationStartedAtRef = useRef<number | null>(null);
  const pendingChineseRef = useRef<string[]>([]);
  const connectionEpochRef = useRef(0);
  const checkingLiveRef = useRef(true);
  const translationRequestIdRef = useRef(0);
  const translationQueueRef = useRef(Promise.resolve());
  const activeTranslationsRef = useRef(0);
  const useLiveRef = useRef(false);

  const switchToRest = (reason?: string) => {
    useLiveRef.current = false;
    checkingLiveRef.current = false;
    liveSessionRef.current?.close();
    liveSessionRef.current = null;
    pendingChineseRef.current = [];
    setTranslationEngine("rest");

    if (reason?.includes("TEXT")) {
      setTranslationError("");
      return;
    }

    if (reason) {
      console.warn("Gemini Live unavailable, using REST streaming:", reason);
    }
  };

  const flushPendingLiveTranslations = () => {
    if (!useLiveRef.current || !liveSessionRef.current) {
      return;
    }

    const pending = [...pendingChineseRef.current];
    pendingChineseRef.current = [];

    for (const text of pending) {
      translationStartedAtRef.current = Date.now();
      setIsTranslating(true);
      liveSessionRef.current.translateChinese(text);
    }
  };

  const translateViaRest = (text: string) => {
    translationQueueRef.current = translationQueueRef.current
      .then(async () => {
        const requestId = ++translationRequestIdRef.current;

        activeTranslationsRef.current += 1;
        setIsTranslating(true);
        setTranslationError("");

        const startedAt = Date.now();

        try {
          const english = await translateChineseToEnglish(text);

          if (requestId !== translationRequestIdRef.current) {
            return;
          }

          setLiveCaption(english);
          setLastTranslationMs(Date.now() - startedAt);
          setTranslationError("");

          await saveCaptionState({
            isLive: true,
            caption: english,
            updatedAt: Date.now(),
          });
        } catch (error) {
          if (requestId !== translationRequestIdRef.current) {
            return;
          }

          console.error(error);
          if (isTranslationError(error)) {
            setTranslationError(formatTranslationError(error));
          } else if (error instanceof Error) {
            setTranslationError(error.message);
          } else {
            setTranslationError(String(error));
          }
        } finally {
          activeTranslationsRef.current -= 1;
          if (activeTranslationsRef.current === 0) {
            setIsTranslating(false);
          }
        }
      })
      .catch((error) => {
        console.error("Translation queue error:", error);
      });
  };

  useEffect(() => {
    let cancelled = false;
    const epoch = ++connectionEpochRef.current;

    connectGeminiLiveCaption({
      onOpen: () => {
        if (cancelled || epoch !== connectionEpochRef.current) {
          return;
        }

        useLiveRef.current = true;
        checkingLiveRef.current = false;
        setTranslationEngine("live");
        setTranslationError("");
        flushPendingLiveTranslations();
      },
      onCaption: (text, isFinal) => {
        if (!useLiveRef.current) {
          return;
        }

        setLiveCaption(text);
        setIsTranslating(!isFinal);

        if (isFinal) {
          if (translationStartedAtRef.current !== null) {
            setLastTranslationMs(Date.now() - translationStartedAtRef.current);
            translationStartedAtRef.current = null;
          }

          void saveCaptionState({
            isLive: true,
            caption: text,
            updatedAt: Date.now(),
          }).catch((error) => {
            console.error("Failed to save caption state:", error);
          });
        }
      },
      onError: (message) => {
        if (cancelled || epoch !== connectionEpochRef.current) {
          return;
        }

        switchToRest(message);
        setIsTranslating(false);
      },
      onClose: (reason) => {
        if (cancelled || epoch !== connectionEpochRef.current) {
          return;
        }

        if (useLiveRef.current || checkingLiveRef.current) {
          switchToRest(reason);
        }

        setIsTranslating(false);
      },
    })
      .then((session) => {
        if (cancelled || epoch !== connectionEpochRef.current) {
          session.close();
          return;
        }

        liveSessionRef.current = session;
      })
      .catch((error) => {
        if (cancelled || epoch !== connectionEpochRef.current) {
          return;
        }

        switchToRest(
          error instanceof Error ? error.message : String(error)
        );
      });

    return () => {
      cancelled = true;
      connectionEpochRef.current += 1;
      liveSessionRef.current?.close();
      liveSessionRef.current = null;
      pendingChineseRef.current = [];
    };
  }, []);

  const sendChineseForTranslationRef = useRef<(text: string) => void>(() => {});

  sendChineseForTranslationRef.current = (text: string) => {
    if (useLiveRef.current && liveSessionRef.current) {
      translationStartedAtRef.current = Date.now();
      setIsTranslating(true);
      setTranslationError("");
      liveSessionRef.current.translateChinese(text);
      return;
    }

    translateViaRest(text);
  };

  const speechBuffer = useMemo(
    () =>
      createSpeechBuffer({
        delayMs: 400,
        onFlush: (text) => {
          sendChineseForTranslationRef.current(text);
        },
      }),
    []
  );

  const speechRecognitionRef = useRef<ReturnType<
    typeof createDesktopSpeechRecognition
  > | null>(null);

  useEffect(() => {
    speechRecognitionRef.current = createDesktopSpeechRecognition({
      onTranscript: (finalText, displayText) => {
        setMicTranscript(displayText);
        if (finalText) {
          speechBuffer.add(finalText);
        }
      },
      onListeningChange: (listening) => {
        setIsListening(listening);
        if (listening) {
          setMicError("");
        }
      },
      onError: (message) => {
        setIsListening(false);
        setMicError(message);
      },
    });

    return () => {
      speechRecognitionRef.current?.stop();
    };
  }, [speechBuffer]);

  const startMicrophone = () => {
    const result = speechRecognitionRef.current?.start();
    if (!result?.ok) {
      alert(
        result?.error ??
          "Speech recognition is not supported in this browser. Please use Chrome."
      );
      return false;
    }

    setIsListening(true);
    setMicError("");
    return true;
  };

  const translationStatusLabel =
    translationEngine === "checking"
      ? "Checking Live API..."
      : translationEngine === "live"
        ? "Connected (Live API)"
        : "Ready (REST streaming)";

  return {
    translationEngine,
    translationStatusLabel,
    isConnected: translationEngine === "live",
    isListening,
    micTranscript,
    isTranslating,
    translationError,
    micError,
    lastTranslationMs,
    liveCaption,
    startMicrophone,
  };
}
