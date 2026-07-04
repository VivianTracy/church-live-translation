"use client";

import { Header } from "@/components/Header";
import { MicrophoneCard } from "@/components/MicrophoneCard";
import { saveCaptionState } from "@/lib/captionApi";
import { connectGeminiLiveCaption } from "@/lib/geminiLiveCaption";
import { createDesktopSpeechRecognition } from "@/lib/desktopSpeechRecognition";
import { createSpeechBuffer } from "@/lib/speechBuffer";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export default function OperatorLivePage() {
  const [isLive, setIsLive] = useState(false);
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

  const translateAndBroadcast = (text: string) => {
    if (!liveSessionRef.current) {
      setTranslationError("Live API session is not connected yet.");
      return;
    }

    translationStartedAtRef.current = Date.now();
    setIsTranslating(true);
    setTranslationError("");
    setIsLive(true);
    liveSessionRef.current.translateChinese(text);
  };

  const translateAndBroadcastRef = useRef(translateAndBroadcast);
  translateAndBroadcastRef.current = translateAndBroadcast;

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

  const handleStartMicrophone = () => {
    if (!isConnected) {
      setTranslationError("Waiting for Gemini Live API connection...");
      return;
    }

    const result = speechRecognitionRef.current?.start();
    if (!result?.ok) {
      alert(result?.error ?? "Speech recognition is not supported.");
      return;
    }

    setMicError("");
    setTranslationError("");
  };

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-8">
        <Header />

        <section className="rounded-3xl border border-violet-200 bg-violet-50 p-6 text-sm text-violet-950 space-y-2">
          <p className="font-semibold">Experimental: Gemini Live API</p>
          <p>
            This page uses a persistent WebSocket session instead of REST
            `/api/translate`. Compare latency with the{" "}
            <Link href="/operator" className="font-semibold underline">
              standard operator
            </Link>
            .
          </p>
          <p>
            Live session:{" "}
            <span className="font-semibold">
              {isConnected ? "Connected" : "Connecting..."}
            </span>
          </p>
          {liveCaption && (
            <p className="rounded-2xl bg-white/70 p-3 text-base text-slate-800">
              Latest caption: {liveCaption}
            </p>
          )}
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
