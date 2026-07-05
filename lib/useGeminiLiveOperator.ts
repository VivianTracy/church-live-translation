"use client";

import { saveCaptionState } from "@/lib/captionApi";
import { connectGeminiLiveCaption } from "@/lib/geminiLiveCaption";
import { loadServiceContext } from "@/lib/serviceContextApi";
import {
  formatTranslationError,
  isTranslationError,
  translateChineseToEnglish,
} from "@/lib/translation";
import { createDesktopSpeechRecognition } from "@/lib/desktopSpeechRecognition";
import { createSpeechBuffer } from "@/lib/speechBuffer";
import { createSentenceCaptionPipeline } from "@/lib/sentenceCaptionPipeline";
import { useEffect, useMemo, useRef, useState } from "react";

export type TranslationEngine = "checking" | "live" | "rest";

const LIVE_RESPONSE_TIMEOUT_MS = 8000;

export function useGeminiLiveOperator(translationSessionVersion = 0) {
  const [translationEngine, setTranslationEngine] =
    useState<TranslationEngine>("checking");
  const [usesSermonContext, setUsesSermonContext] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micTranscript, setMicTranscript] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState("");
  const [micError, setMicError] = useState("");
  const [micNotice, setMicNotice] = useState("");
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
  const liveResponseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const awaitingLiveCaptionRef = useRef("");

  const clearLiveResponseTimeout = () => {
    if (liveResponseTimeoutRef.current) {
      clearTimeout(liveResponseTimeoutRef.current);
      liveResponseTimeoutRef.current = null;
    }
    awaitingLiveCaptionRef.current = "";
  };

  const switchToRest = (reason?: string) => {
    clearLiveResponseTimeout();
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

  const activateLiveSession = () => {
    useLiveRef.current = true;
    checkingLiveRef.current = false;
    setTranslationEngine("live");
    setTranslationError("");

    const pending = [...pendingChineseRef.current];
    pendingChineseRef.current = [];

    for (const text of pending) {
      sendLiveTranslation(text);
    }
  };

  const sendLiveTranslation = (text: string) => {
    if (!liveSessionRef.current) {
      pendingChineseRef.current.push(text);
      return;
    }

    translationStartedAtRef.current = Date.now();
    setIsTranslating(true);
    setTranslationError("");
    awaitingLiveCaptionRef.current = text;
    liveSessionRef.current.translateChinese(text);

    clearLiveResponseTimeout();
    liveResponseTimeoutRef.current = setTimeout(() => {
      if (!useLiveRef.current) {
        return;
      }

      const pendingText = awaitingLiveCaptionRef.current;
      switchToRest("Live API response timeout");
      setIsTranslating(false);

      if (pendingText) {
        translateViaRest(pendingText);
      }
    }, LIVE_RESPONSE_TIMEOUT_MS);
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

    clearLiveResponseTimeout();
    checkingLiveRef.current = true;
    useLiveRef.current = false;
    liveSessionRef.current?.close();
    liveSessionRef.current = null;
    pendingChineseRef.current = [];
    setTranslationEngine("checking");

    loadServiceContext()
      .then((context) => {
        if (cancelled) {
          return;
        }

        const hasSermonContext = context.sermonText.trim().length > 0;
        setUsesSermonContext(hasSermonContext);

        if (hasSermonContext) {
          checkingLiveRef.current = false;
          setTranslationEngine("rest");
          return null;
        }

        return connectGeminiLiveCaption({
          onCaption: (text, isFinal) => {
            if (!useLiveRef.current) {
              return;
            }

            if (!liveSessionRef.current?.canAcceptCaption()) {
              return;
            }

            setLiveCaption(text);
            setIsTranslating(!isFinal);

            if (isFinal) {
              clearLiveResponseTimeout();
              if (translationStartedAtRef.current !== null) {
                setLastTranslationMs(
                  Date.now() - translationStartedAtRef.current
                );
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
        });
      })
      .then((session) => {
        if (cancelled || epoch !== connectionEpochRef.current) {
          session?.close();
          return;
        }

        if (!session) {
          return;
        }

        liveSessionRef.current = session;
        activateLiveSession();
      })
      .catch((error) => {
        if (cancelled || epoch !== connectionEpochRef.current) {
          return;
        }

        switchToRest(error instanceof Error ? error.message : String(error));
      });

    return () => {
      cancelled = true;
      connectionEpochRef.current += 1;
      clearLiveResponseTimeout();
      liveSessionRef.current?.close();
      liveSessionRef.current = null;
      pendingChineseRef.current = [];
    };
  }, [translationSessionVersion]);

  const sendChineseForTranslationRef = useRef<(text: string) => void>(() => {});

  sendChineseForTranslationRef.current = (text: string) => {
    if (useLiveRef.current && liveSessionRef.current) {
      sendLiveTranslation(text);
      return;
    }

    if (useLiveRef.current && !liveSessionRef.current) {
      pendingChineseRef.current.push(text);
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

  const sentencePipelineRef = useRef<ReturnType<
    typeof createSentenceCaptionPipeline
  > | null>(null);
  const useSentencePipelineRef = useRef(true);

  useEffect(() => {
    useSentencePipelineRef.current =
      usesSermonContext || translationEngine !== "live";
  }, [usesSermonContext, translationEngine]);

  useEffect(() => {
    sentencePipelineRef.current = createSentenceCaptionPipeline({
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
      translate: (chinese) => translateChineseToEnglish(chinese),
    });

    return () => {
      sentencePipelineRef.current?.reset();
    };
  }, [translationSessionVersion]);

  const speechRecognitionRef = useRef<ReturnType<
    typeof createDesktopSpeechRecognition
  > | null>(null);

  useEffect(() => {
    speechRecognitionRef.current = createDesktopSpeechRecognition({
      onTranscript: (finalText, displayText) => {
        setMicTranscript(displayText);
        if (finalText) {
          if (useSentencePipelineRef.current) {
            sentencePipelineRef.current?.addFinalTranscript(finalText);
          } else {
            speechBuffer.add(finalText);
          }
        }
      },
      onListeningChange: (listening) => {
        setIsListening(listening);
        if (listening) {
          setMicError("");
          setMicNotice("");
        }
      },
      onRecovering: (message) => {
        setMicNotice(message);
      },
      onError: (message) => {
        setIsListening(false);
        setMicNotice("");
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
    setMicNotice("");
    return true;
  };

  const stopMicrophone = () => {
    speechRecognitionRef.current?.stop();
    setIsListening(false);
    setMicNotice("");
  };

  const restartMicrophone = () => {
    const result = speechRecognitionRef.current?.restart();
    if (!result?.ok) {
      alert(
        result?.error ??
          "Speech recognition is not supported in this browser. Please use Chrome."
      );
      return false;
    }

    setIsListening(true);
    setMicError("");
    setMicNotice("Restarting microphone...");
    return true;
  };

  const translationStatusLabel =
    translationEngine === "checking"
      ? "Checking Live API..."
      : translationEngine === "live"
        ? "Connected (Live API)"
        : usesSermonContext
          ? "Ready (REST with sermon context)"
          : "Ready (REST streaming)";

  return {
    translationEngine,
    translationStatusLabel,
    usesSermonContext,
    isConnected: translationEngine === "live",
    isListening,
    micTranscript,
    isTranslating,
    translationError,
    micError,
    micNotice,
    lastTranslationMs,
    liveCaption,
    startMicrophone,
    stopMicrophone,
    restartMicrophone,
  };
}
