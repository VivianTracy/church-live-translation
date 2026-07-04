"use client";

import { AdvancedSettings } from "@/components/AdvancedSettings";
import { AudienceCard } from "@/components/AudienceCard";
import { BroadcastCard } from "@/components/BroadcastCard";
import { Header } from "@/components/Header";
import { MicrophoneCard } from "@/components/MicrophoneCard";
import { StatusCard } from "@/components/StatusCard";
import { saveCaptionState } from "@/lib/captionApi";
import {
  formatTranslationError,
  TranslationError,
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
  const [lastTranslationMs, setLastTranslationMs] = useState<number | null>(
    null
  );

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

  const translateAndBroadcast = async (text: string) => {
    setIsTranslating(true);
    setTranslationError("");

    const startedAt = Date.now();

    try {
      const english = await translateChineseToEnglish(text);

      setTranslationError("");
      setLastTranslationMs(Date.now() - startedAt);

      await saveCaptionState({
        isLive: true,
        caption: english,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error(error);
      if (error instanceof TranslationError) {
        setTranslationError(formatTranslationError(error));
      } else if (error instanceof Error) {
        setTranslationError(error.message);
      } else {
        setTranslationError(String(error));
      }
    } finally {
      setIsTranslating(false);
    }
  };

  
  const speechBuffer = useMemo(
    () =>
      createSpeechBuffer({
        delayMs: 2000,
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
      onListeningChange: setIsListening,
      onError: setTranslationError,
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