"use client";

import { Header } from "@/components/Header";
import { MicrophoneCard } from "@/components/MicrophoneCard";
import { saveCaptionState } from "@/lib/captionApi";
import {
  formatTranslationError,
  isTranslationError,
  translateChineseToEnglish,
} from "@/lib/translation";
import { createDesktopSpeechRecognition } from "@/lib/desktopSpeechRecognition";
import { createSpeechBuffer } from "@/lib/speechBuffer";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export default function OperatorRestPage() {
  const [isListening, setIsListening] = useState(false);
  const [micTranscript, setMicTranscript] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState("");
  const [micError, setMicError] = useState("");
  const [lastTranslationMs, setLastTranslationMs] = useState<number | null>(
    null
  );
  const translationRequestIdRef = useRef(0);
  const translationQueueRef = useRef(Promise.resolve());
  const activeTranslationsRef = useRef(0);

  const translateAndBroadcast = (text: string) => {
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

          setTranslationError("");
          setLastTranslationMs(Date.now() - startedAt);

          void saveCaptionState({
            isLive: true,
            caption: english,
            updatedAt: Date.now(),
          }).catch((error) => {
            console.error("Failed to save caption state:", error);
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

  const translateAndBroadcastRef = useRef(translateAndBroadcast);
  translateAndBroadcastRef.current = translateAndBroadcast;

  const speechBuffer = useMemo(
    () =>
      createSpeechBuffer({
        delayMs: 800,
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

  const handleStartMicrophone = () => {
    const result = speechRecognitionRef.current?.start();

    if (!result?.ok) {
      alert(
        result?.error ??
          "Speech recognition is not supported in this browser. Please use Chrome."
      );
      return;
    }

    setTranslationError("");
    setMicError("");
  };

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-8">
        <Header />

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950 space-y-2">
          <p className="font-semibold">Legacy REST operator</p>
          <p>
            This page uses the older `/api/translate` loop. For worship, use the{" "}
            <Link href="/operator" className="font-semibold underline">
              Gemini Live operator
            </Link>{" "}
            instead.
          </p>
        </section>

        <MicrophoneCard
          isListening={isListening}
          micTranscript={micTranscript}
          isTranslating={isTranslating}
          micError={micError}
          translationError={translationError}
          lastTranslationMs={lastTranslationMs}
          onStartMicrophone={handleStartMicrophone}
        />
      </div>
    </main>
  );
}
