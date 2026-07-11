"use client";

import { AudioMonitorCard } from "@/components/AudioMonitorCard";
import { AudioOutputDeviceCard } from "@/components/AudioOutputDeviceCard";
import { AudioTranslationStatusCard } from "@/components/AudioTranslationStatusCard";
import { Header } from "@/components/Header";
import { MicrophoneDeviceCard } from "@/components/MicrophoneDeviceCard";
import { TranslationChannelCard } from "@/components/TranslationChannelCard";
import { useAudioTranslationOperator } from "@/lib/useAudioTranslationOperator";
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
    latencyMs,
    inputLevel,
    inputPeak,
    outputLevel,
    outputPeak,
    translationStatusLabel,
    startListening,
    stopListening,
    restartListening,
  } = useAudioTranslationOperator();

  const handleToggleLive = () => {
    const nextIsLive = !isLive;

    if (!nextIsLive) {
      setIsLive(false);
      stopListening();
      setSeconds(0);
      return;
    }

    setIsLive(true);
  };

  const handleStartListening = async () => {
    setIsLive(true);

    if (!(await startListening())) {
      return;
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
            CHURCH AUDIO TRANSLATION
          </p>
          <p className="text-base font-semibold">
            Send live English audio to Retekess wireless receivers from the church
            computer.
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-violet-900">
            <li>Select sermon audio input from OBS or your virtual cable.</li>
            <li>
              Select transmitter output (monitor headphone jack, USB audio dongle,
              or line out).
            </li>
            <li>Press Start Live Translation, then Start Audio Input.</li>
            <li>
              Connect 3.5 mm output to the TT125-TX MIC port. Congregation listens
              on TT125 receivers.
            </li>
          </ol>
          <p className="text-xs text-violet-800">
            Run this page on the church computer in Chrome or Edge. Stop translation
            before changing microphone or output devices.
          </p>
        </section>

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
          translationStatusLabel={translationStatusLabel}
          micError={micError}
          translationError={translationError}
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
