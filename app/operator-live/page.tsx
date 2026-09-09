"use client";

import { AudioInputSourceCard } from "@/components/AudioInputSourceCard";
import { AudioMonitorCard } from "@/components/AudioMonitorCard";
import { AudioOutputDeviceCard } from "@/components/AudioOutputDeviceCard";
import { AudioTranslationStatusCard } from "@/components/AudioTranslationStatusCard";
import { ChurchTranslationHeader } from "@/components/ChurchTranslationHeader";
import { TranslationDirectionCard } from "@/components/TranslationDirectionCard";
import { TranslationSetupSummary } from "@/components/TranslationSetupSummary";
import { formatAudioTranslationDirectionLabel } from "@/lib/audioTranslationDirection";
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
    audioInputSource,
    setAudioInputSource,
    audioInputSourceLabel,
    inputDeviceLabel,
    outputDeviceId,
    setOutputDeviceId,
    translationDirection,
    resolvedDirection,
    setTranslationDirection,
    outputDeviceLabel,
    inputLanguageLabel,
    outputLanguageLabel,
    micError,
    translationError,
    latencyMs,
    inputLevel,
    inputPeak,
    outputLevel,
    outputPeak,
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
      <div className="mx-auto max-w-2xl space-y-6">
        <ChurchTranslationHeader />

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-8">
          <TranslationDirectionCard
            selectedDirection={translationDirection}
            resolvedDirection={resolvedDirection}
            isDetecting={
              isListening && translationDirection === "auto" && !resolvedDirection
            }
            disabled={isListening}
            onDirectionChange={setTranslationDirection}
          />

          <div className="border-t border-slate-200 pt-8 space-y-8">
            <AudioInputSourceCard
              selectedSource={audioInputSource}
              selectedDeviceId={micDeviceId}
              disabled={isListening}
              onSourceChange={(source) => {
                void setAudioInputSource(source);
              }}
              onDeviceChange={setMicDeviceId}
            />

            <AudioOutputDeviceCard
              selectedDeviceId={outputDeviceId}
              disabled={isListening}
              onDeviceChange={setOutputDeviceId}
              outputLanguageLabel={outputLanguageLabel}
            />
          </div>

          <p className="text-xs text-slate-500 border-t border-slate-200 pt-4">
            Stop translation before changing settings. Connect a 3.5 mm cable from
            audio out to the TT125-TX MIC port.
          </p>
        </section>

        <TranslationSetupSummary
          directionLabel={formatAudioTranslationDirectionLabel(
            translationDirection,
            translationDirection === "auto" ? resolvedDirection : null,
            isListening && translationDirection === "auto" && !resolvedDirection
          )}
          inputSourceLabel={audioInputSourceLabel}
          inputDeviceLabel={inputDeviceLabel}
          outputDeviceLabel={outputDeviceLabel}
          isRouting={isLive && isTranslating}
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
          inputLanguageLabel={inputLanguageLabel}
          outputLanguageLabel={outputLanguageLabel}
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
