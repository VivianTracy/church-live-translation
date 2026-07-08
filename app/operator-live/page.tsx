"use client";

import { AudioMonitorCard } from "@/components/AudioMonitorCard";
import { AudioOperatorRelatedPagesCard } from "@/components/AudioOperatorRelatedPagesCard";
import { AudioOutputDeviceCard } from "@/components/AudioOutputDeviceCard";
import { AudioTranslationStatusCard } from "@/components/AudioTranslationStatusCard";
import { Header } from "@/components/Header";
import { MicrophoneDeviceCard } from "@/components/MicrophoneDeviceCard";
import { TranslationAudienceCard } from "@/components/TranslationAudienceCard";
import { TranslationChannelCard } from "@/components/TranslationChannelCard";
import { useAudioTranslationOperator } from "@/lib/useAudioTranslationOperator";
import { clearTranslationListenState, saveTranslationListenState } from "@/lib/translationListenApi";
import { useEffect, useState } from "react";

export default function OperatorLivePage() {
  const [isLive, setIsLive] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const {
    isListening,
    isTranslating,
    micDeviceId,
    setMicDeviceId,
    outputDeviceId,
    setOutputDeviceId,
    outputDeviceLabel,
    micError,
    translationError,
    audienceBroadcastError,
    latencyMs,
    inputLevel,
    inputPeak,
    outputLevel,
    outputPeak,
    translationStatusLabel,
    inputTranscript,
    outputTranscript,
    startListening,
    stopListening,
    restartListening,
  } = useAudioTranslationOperator(isLive);

  const handleToggleLive = () => {
    const nextIsLive = !isLive;
    setIsLive(nextIsLive);

    if (!nextIsLive) {
      stopListening();
      setSeconds(0);
      void clearTranslationListenState();
      return;
    }

    void saveTranslationListenState({
      isLive: true,
      updatedAt: Date.now(),
    });
  };

  const handleStartListening = async () => {
    if (await startListening()) {
      setIsLive(true);

      void saveTranslationListenState({
        isLive: true,
        updatedAt: Date.now(),
      });
    }
  };

  useEffect(() => {
    if (!isLive) {
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

        <section className="rounded-3xl border border-violet-200 bg-violet-50 p-6 text-sm text-violet-950 space-y-3">
          <p className="text-sm font-bold tracking-widest text-violet-800">
            AUDIO TRANSLATION CONSOLE
          </p>
          <p className="text-base font-semibold">
            Send live English audio to the church translation channel and phones.
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-violet-900">
            <li>Select Chinese sermon audio input (BlackHole from OBS).</li>
            <li>Select the translation channel output for earpiece listeners.</li>
            <li>Press Start Live Translation, then Start Audio Input.</li>
          </ol>
          <p className="text-xs text-violet-800">
            Phone listeners use the QR code below. Deploy this app with Redis so
            phones can connect from anywhere.
          </p>
        </section>

        <TranslationAudienceCard />

        <AudioOperatorRelatedPagesCard />

        <TranslationChannelCard
          isRouting={isLive && isTranslating}
          outputDeviceLabel={outputDeviceLabel}
        />

        <MicrophoneDeviceCard
          selectedDeviceId={micDeviceId}
          disabled={isListening}
          onDeviceChange={setMicDeviceId}
        />

        <AudioOutputDeviceCard
          selectedDeviceId={outputDeviceId}
          disabled={isListening}
          onDeviceChange={setOutputDeviceId}
        />

        <AudioTranslationStatusCard
          isLive={isLive}
          isListening={isListening}
          seconds={seconds}
          onToggleLive={handleToggleLive}
        />

        <AudioMonitorCard
          isListening={isListening}
          isTranslating={isTranslating}
          inputLevel={inputLevel}
          inputPeak={inputPeak}
          outputLevel={outputLevel}
          outputPeak={outputPeak}
          latencyMs={latencyMs}
          inputTranscript={inputTranscript}
          outputTranscript={outputTranscript}
          translationStatusLabel={translationStatusLabel}
          micError={micError}
          translationError={translationError || audienceBroadcastError}
          onStartListening={() => {
            void handleStartListening();
          }}
          onStopListening={stopListening}
          onRestartListening={() => {
            void restartListening();
          }}
        />
      </div>
    </main>
  );
}
