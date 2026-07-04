"use client";

import { saveCaptionState } from "@/lib/captionApi";
import { connectGeminiLiveCaption } from "@/lib/geminiLiveCaption";
import { createDesktopSpeechRecognition } from "@/lib/desktopSpeechRecognition";
import { createSpeechBuffer } from "@/lib/speechBuffer";
import { useEffect, useMemo, useRef, useState } from "react";

export function useGeminiLiveOperator() {
  const [isConnected, setIsConnected] = useState(false);
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

  useEffect(() => {
    let cancelled = false;

    connectGeminiLiveCaption({
      onOpen: () => {
        if (!cancelled) {
          setIsConnected(true);
          setTranslationError("");
        }
      },
      onCaption: (text, isFinal) => {
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
        setTranslationError(message);
        setIsConnected(false);
        setIsTranslating(false);
      },
      onClose: () => {
        setIsConnected(false);
        setIsTranslating(false);
      },
    })
      .then((session) => {
        if (cancelled) {
          session.close();
          return;
        }
        liveSessionRef.current = session;
      })
      .catch((error) => {
        setTranslationError(
          error instanceof Error ? error.message : String(error)
        );
      });

    return () => {
      cancelled = true;
      liveSessionRef.current?.close();
      liveSessionRef.current = null;
    };
  }, []);

  const translateAndBroadcastRef = useRef<(text: string) => void>(() => {});

  translateAndBroadcastRef.current = (text: string) => {
    if (!liveSessionRef.current) {
      setTranslationError("Live API session is not connected yet.");
      return;
    }

    translationStartedAtRef.current = Date.now();
    setIsTranslating(true);
    setTranslationError("");
    liveSessionRef.current.translateChinese(text);
  };

  const speechBuffer = useMemo(
    () =>
      createSpeechBuffer({
        delayMs: 400,
        onFlush: (text) => {
          translateAndBroadcastRef.current(text);
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
      onError: setMicError,
    });

    return () => {
      speechRecognitionRef.current?.stop();
    };
  }, [speechBuffer]);

  const startMicrophone = () => {
    if (!isConnected) {
      setTranslationError("Waiting for Gemini Live API connection...");
      return false;
    }

    const result = speechRecognitionRef.current?.start();
    if (!result?.ok) {
      alert(
        result?.error ??
          "Speech recognition is not supported in this browser. Please use Chrome."
      );
      return false;
    }

    setMicError("");
    setTranslationError("");
    return true;
  };

  return {
    isConnected,
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
