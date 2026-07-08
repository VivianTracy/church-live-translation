"use client";

import { AvReplayTestCard } from "@/components/AvReplayTestCard";
import { CaptionModeCard } from "@/components/CaptionModeCard";
import { CaptionSettingsLinkCard } from "@/components/CaptionSettingsLinkCard";
import { Header } from "@/components/Header";
import { MicrophoneCard } from "@/components/MicrophoneCard";
import { LocalStorageNotice } from "@/components/LocalStorageNotice";
import { MicrophoneDeviceCard } from "@/components/MicrophoneDeviceCard";
import { OperatorRelatedPagesCard } from "@/components/OperatorRelatedPagesCard";
import { SermonSessionCard } from "@/components/SermonSessionCard";
import { StatusCard } from "@/components/StatusCard";
import { WhisperStatusCard } from "@/components/WhisperStatusCard";
import { useOpenAIOperator } from "@/lib/useOpenAIOperator";
import { useEffect, useState } from "react";

export default function OperatorCaptionPage() {
  const [isLive, setIsLive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [showAvReplayTest, setShowAvReplayTest] = useState(false);

  const {
    mode,
    setMode,
    sermonSession,
    isListening,
    micTranscript,
    englishCaption,
    englishCaptionUpdatedAt,
    isTranslating,
    translationError,
    micError,
    lastTranslationMs,
    whisperStatus,
    startMicrophone,
    stopMicrophone,
    endSermon,
    startBroadcast,
    clearBroadcast,
    micDeviceId,
    setMicDeviceId,
  } = useOpenAIOperator();

  const handleToggleLive = async () => {
    const nextIsLive = !isLive;
    setIsLive(nextIsLive);

    if (nextIsLive) {
      await startBroadcast();
      return;
    }

    stopMicrophone();
    await clearBroadcast();
  };

  const handleStartMicrophone = async () => {
    if (await startMicrophone()) {
      setIsLive(true);
      await startBroadcast();
    }
  };

  const handleEndSermon = async () => {
    try {
      await endSermon();
      setIsLive(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleModeChange = (nextMode: "sermon" | "others") => {
    void setMode(nextMode).then(() => {
      setIsLive(false);
    });
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

        <section className="rounded-3xl border border-sky-200 bg-sky-50 p-6 text-sm text-sky-950 space-y-3">
          <p className="text-sm font-bold tracking-widest text-sky-800">
            CAPTION OPERATOR
          </p>
          <p className="text-base font-semibold">
            Run live English captions for the YouTube stream.
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-sky-900">
            <li>Choose a caption mode.</li>
            <li>Select your microphone (BlackHole for OBS audio).</li>
            <li>Press Start Live Caption, then Start Microphone.</li>
          </ol>
          <p className="text-xs text-sky-800">
            For earpiece audio translation, use{" "}
            <span className="font-mono">/operator-live</span>.
          </p>
        </section>

        <OperatorRelatedPagesCard />

        {showAvReplayTest ? (
          <AvReplayTestCard
            operatorPath="/operator-caption"
            transcriptionEngine="OpenAI gpt-4o-mini-transcribe (REST chunks)"
          />
        ) : null}

        <CaptionModeCard
          mode={mode}
          disabled={isListening}
          onModeChange={handleModeChange}
        />

        <MicrophoneDeviceCard
          selectedDeviceId={micDeviceId}
          disabled={isListening}
          onDeviceChange={setMicDeviceId}
        />

        <StatusCard
          isLive={isLive}
          isListening={isListening}
          seconds={seconds}
          onToggleLive={handleToggleLive}
        />

        <MicrophoneCard
          isListening={isListening}
          micTranscript={micTranscript}
          englishCaption={englishCaption}
          englishCaptionUpdatedAt={englishCaptionUpdatedAt}
          isTranslating={isTranslating}
          micError={micError}
          micNotice="Use BlackHole (Mac) or VB-Cable (Windows) when audio comes from OBS."
          translationError={translationError}
          lastTranslationMs={lastTranslationMs}
          onStartMicrophone={() => {
            void handleStartMicrophone();
          }}
          onStopMicrophone={stopMicrophone}
          onRestartMicrophone={() => {
            void handleStartMicrophone();
          }}
        />

        <SermonSessionCard
          mode={mode}
          session={sermonSession}
          onEndSermon={handleEndSermon}
        />

        <LocalStorageNotice />

        <CaptionSettingsLinkCard />

        <WhisperStatusCard status={whisperStatus} />
      </div>
    </main>
  );
}
