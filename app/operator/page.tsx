"use client";

import { AvReplayTestCard } from "@/components/AvReplayTestCard";
import { SermonContextCard } from "@/components/SermonContextCard";
import { AdvancedSettings } from "@/components/AdvancedSettings";
import { BroadcastCard } from "@/components/BroadcastCard";
import { Header } from "@/components/Header";
import { MicrophoneCard } from "@/components/MicrophoneCard";
import { StatusCard } from "@/components/StatusCard";
import { OperatorWorkflowNote } from "@/components/OperatorWorkflowNote";
import { saveCaptionState } from "@/lib/captionApi";
import { useGeminiLiveOperator } from "@/lib/useGeminiLiveOperator";
import { useEffect, useState } from "react";

export default function OperatorPage() {
  const [isLive, setIsLive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [translationSessionVersion, setTranslationSessionVersion] = useState(0);
  const [showAvReplayTest, setShowAvReplayTest] = useState(false);
  const [testCaption, setTestCaption] = useState(
    "Welcome to today's worship service."
  );

  const {
    translationEngine,
    translationStatusLabel,
    usesSermonContext,
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
  } = useGeminiLiveOperator(translationSessionVersion);

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
    if (startMicrophone()) {
      setIsLive(true);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setShowAvReplayTest(params.get("test") === "1");
  }, []);

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

        {showAvReplayTest ? <AvReplayTestCard /> : null}

        <SermonContextCard
          onContextSaved={() => {
            setTranslationSessionVersion((value) => value + 1);
          }}
        />

        <section className="rounded-3xl border border-violet-200 bg-violet-50 p-6 text-sm text-violet-950 space-y-2">
          <p className="font-semibold">Gemini Live API</p>
          <p>
            Translation:{" "}
            <span className="font-semibold">{translationStatusLabel}</span>
          </p>
          {translationEngine === "rest" && usesSermonContext && (
            <p className="text-xs text-violet-800">
              Sermon manuscript context uses REST translation for reliability. Live
              API stays off while manuscript context is saved.
            </p>
          )}
          {translationEngine === "rest" && !usesSermonContext && (
            <p className="text-xs text-violet-800">
              Available Live models on this key do not support TEXT captions with
              a custom sermon prompt, so translation uses REST streaming.
            </p>
          )}
          {translationError && (
            <pre className="whitespace-pre-wrap rounded-2xl bg-white/70 p-3 text-xs font-semibold text-red-700">
              {translationError}
            </pre>
          )}
          {liveCaption && (
            <p className="rounded-2xl bg-white/70 p-3 text-base text-slate-800">
              Latest caption: {liveCaption}
            </p>
          )}
          <p className="text-xs text-violet-800">
            Experimental OpenAI operator:{" "}
            <a href="/operator-caption" className="font-semibold underline">
              /operator-caption
            </a>
          </p>
          <p className="text-xs text-violet-800">
            AV replay test mode:{" "}
            <a href="/operator?test=1" className="font-semibold underline">
              /operator?test=1
            </a>
          </p>
          <p className="text-xs text-violet-800">
            Fallback REST operator:{" "}
            <a href="/operator-rest" className="font-semibold underline">
              /operator-rest
            </a>
          </p>
        </section>

        <StatusCard
          isLive={isLive}
          isListening={isListening}
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
          micNotice={micNotice}
          translationError={translationError}
          lastTranslationMs={lastTranslationMs}
          onStartMicrophone={handleStartMicrophone}
          onStopMicrophone={stopMicrophone}
          onRestartMicrophone={restartMicrophone}
        />

        <AdvancedSettings
          showAdvanced={showAdvanced}
          onToggleAdvanced={() => setShowAdvanced((value) => !value)}
        />
      </div>
    </main>
  );
}
