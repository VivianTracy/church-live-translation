"use client";

import { saveCaptionState } from "@/lib/captionState";
import { translateChineseToEnglish } from "@/lib/translation";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { StatusCard } from "@/components/StatusCard";
import { BroadcastCard } from "@/components/BroadcastCard";
import { MicrophoneCard } from "@/components/MicrophoneCard";
import { AudienceCard } from "@/components/AudienceCard";
import { AdvancedSettings } from "@/components/AdvancedSettings";

export default function OperatorPage() {
  // Operator session state
  const [isLive, setIsLive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Manual test caption state
  const [testCaption, setTestCaption] = useState(
    "Welcome to today's worship service."
  );

  // Microphone and translation state
  const [isListening, setIsListening] = useState(false);
  const [micTranscript, setMicTranscript] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState("");
  const [lastTranslationMs, setLastTranslationMs] = useState<number | null>(
    null
  );

  /**
   * Start or stop the live caption session.
   *
   * This updates the operator UI and broadcasts the current
   * live status to the audience page.
   */
  const handleToggleLive = () => {
    const nextIsLive = !isLive;
    setIsLive(nextIsLive);

    saveCaptionState({
      isLive: nextIsLive,
      caption: nextIsLive ? "Live captions have started." : "",
      updatedAt: Date.now(),
    });
  };

  /**
   * Send a manual test caption.
   *
   * This lets us test the full operator-to-audience pipeline
   * before relying on microphone input or AI translation.
   */
  const handleSendTestCaption = () => {
    setIsLive(true);

    saveCaptionState({
      isLive: true,
      caption: testCaption,
      updatedAt: Date.now(),
    });
  };

  /**
   * Start browser speech recognition.
   *
   * Pipeline:
   * Microphone → Chinese transcript → Gemini translation → Audience page
   */
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

      // Show interim Chinese text on the operator page only.
      setMicTranscript(finalTranscript || interimTranscript);

      // Translate only finalized speech.
      // Interim results change constantly and create unstable captions.
      if (!finalTranscript.trim()) {
        return;
      }

      setIsTranslating(true);
      setTranslationError("");

      const startedAt = Date.now();

      try {
        const english = await translateChineseToEnglish(finalTranscript);

        setLastTranslationMs(Date.now() - startedAt);

        saveCaptionState({
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

  /**
   * Count how long the live caption session has been running.
   */
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

        {/* Advanced Settings */}
        <AdvancedSettings
          showAdvanced={showAdvanced}
          onToggleAdvanced={() => setShowAdvanced((value) => !value)}
        />
      </div>
    </main>
  );
}