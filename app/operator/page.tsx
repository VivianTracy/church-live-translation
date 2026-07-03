"use client";

import { AdvancedSettings } from "@/components/AdvancedSettings";
import { AudienceCard } from "@/components/AudienceCard";
import { BroadcastCard } from "@/components/BroadcastCard";
import { Header } from "@/components/Header";
import { MicrophoneCard } from "@/components/MicrophoneCard";
import { StatusCard } from "@/components/StatusCard";
import { saveCaptionState } from "@/lib/captionApi";
import { translateChineseToEnglish } from "@/lib/translation";
import { useEffect, useState } from "react";

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

  const handleStartMicrophone = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Speech recognition is not supported in this browser. Please use Chrome."
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setIsLive(true);
      setTranslationError("");
    };

    recognition.onresult = async (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setMicTranscript(finalTranscript || interimTranscript);

      if (!finalTranscript.trim()) {
        return;
      }

      setIsTranslating(true);
      setTranslationError("");

      const startedAt = Date.now();

      try {
        const english = await translateChineseToEnglish(finalTranscript);

        setLastTranslationMs(Date.now() - startedAt);

        await saveCaptionState({
          isLive: true,
          caption: english,
          updatedAt: Date.now(),
        });
      } catch (error) {
        console.error(error);
        setTranslationError("Translation unavailable. Please try again.");
      } finally {
        setIsTranslating(false);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setTranslationError("Microphone error. Please try again.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  useEffect(() => {
    if (!isLive) {
      setSeconds(0);
      return;
    }

    const timer = setInterval(() => {
      setSeconds((value) => value + 1);
    }, 1000);

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