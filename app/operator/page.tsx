"use client";

import { AdvancedSettings } from "@/components/AdvancedSettings";
import { AudienceCard } from "@/components/AudienceCard";
import { BroadcastCard } from "@/components/BroadcastCard";
import { Header } from "@/components/Header";
import { MicrophoneCard } from "@/components/MicrophoneCard";
import { StatusCard } from "@/components/StatusCard";
import { OperatorWorkflowNote } from "@/components/OperatorWorkflowNote";
import { saveCaptionState } from "@/lib/captionApi";
import {
  formatTranslationError,
  isTranslationError,
  translateChineseToEnglish,
} from "@/lib/translation";
import { createDesktopSpeechRecognition } from "@/lib/desktopSpeechRecognition";
import { useEffect, useMemo, useRef, useState } from "react";
import { createSpeechBuffer } from "@/lib/speechBuffer";

export default function OperatorPage() {
  const [isLive, setIsLive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [testCaption, setTestCaption] = useState(
    "Welcome to today's worship service."
  );

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

  const handleToggleLive = async () => {
    const nextIsLive = !isLive;
    setIsLive(nextIsLive);

    await saveCaptionState({
      isLive: nextIsLive,
      caption: nextIsLive ? "Live captions have started." : "",
      updatedAt: Date.now(),
    });
  };

  const handleSendTestCaption = async () => {
    setIsLive(true);

    await saveCaptionState({
      isLive: true,
      caption: testCaption,
      updatedAt: Date.now(),
    });
  };

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

  
  const speechBuffer = useMemo(
    () =>
      createSpeechBuffer({
        delayMs: 800,
        onFlush: (text) => {
          translateAndBroadcast(text);
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

    setIsLive(true);
    setTranslationError("");
    setMicError("");
  };

  useEffect(() => {
    if (!isLive) {
      setSeconds(0);
      return;
    }

    const timer = setInterval(() => {
      setSeconds((value) => value + 1);
    }, 2000);

    return () => clearInterval(timer);
  }, [isLive]);



  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-8">
        <Header />

        <OperatorWorkflowNote />

        <p className="text-center text-sm">
          <a href="/operator-live" className="font-semibold text-violet-700 underline">
            Try the faster Gemini Live operator (experimental)
          </a>
        </p>

        <StatusCard
          isLive={isLive}
          seconds={seconds}
          onToggleLive={handleToggleLive}
        />

        <BroadcastCard
          testCaption={testCaption}
          onChangeTestCaption={setTestCaption}
          onSendTestCaption={handleSendTestCaption}
        />

        <MicrophoneCard
          isListening={isListening}
          micTranscript={micTranscript}
          isTranslating={isTranslating}
          micError={micError}
          translationError={translationError}
          lastTranslationMs={lastTranslationMs}
          onStartMicrophone={handleStartMicrophone}
        />

        <AudienceCard />

        <AdvancedSettings
          showAdvanced={showAdvanced}
          onToggleAdvanced={() => setShowAdvanced((value) => !value)}
        />
      </div>
    </main>
  );
}