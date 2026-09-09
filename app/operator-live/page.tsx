"use client";

import { AudioInputSourceCard } from "@/components/AudioInputSourceCard";
import { AudioMonitorCard } from "@/components/AudioMonitorCard";
import { AudioOutputDeviceCard } from "@/components/AudioOutputDeviceCard";
import { AudioTranslationStatusCard } from "@/components/AudioTranslationStatusCard";
import { ChurchTranslationHeader } from "@/components/ChurchTranslationHeader";
import { TranslationDirectionCard } from "@/components/TranslationDirectionCard";
import { TranslationSetupSummary } from "@/components/TranslationSetupSummary";
import { formatAudioTranslationDirectionLabel } from "@/lib/audioTranslationDirection";
import { isOperatorSessionTiming } from "@/lib/operatorSessionState";
import { useAudioTranslationOperator } from "@/lib/useAudioTranslationOperator";
import { useEffect, useState } from "react";

export default function OperatorLivePage() {
  const [seconds, setSeconds] = useState(0);

  const {
    isTranslating,
    micDeviceId,
    setMicDeviceId,
    audioInputSource,
    setAudioInputSource,
    audioInputSourceLabel,
    inputDeviceLabel,
    outputDeviceId,
    setOutputDeviceId,
    outputVolume,
    setOutputVolume,
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
    sessionStatus,
    autoReconnectsUsed,
    settingsLocked,
    startListening,
    stopListening,
  } = useAudioTranslationOperator();

  useEffect(() => {
    if (!isOperatorSessionTiming(sessionStatus)) {
      return;
    }

    const timer = setInterval(() => {
      setSeconds((value) => value + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionStatus]);

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-2xl space-y-6">
        <ChurchTranslationHeader />

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-8">
          <TranslationDirectionCard
            selectedDirection={translationDirection}
            resolvedDirection={resolvedDirection}
            isDetecting={
              sessionStatus === "live" &&
              translationDirection === "auto" &&
              !resolvedDirection
            }
            disabled={settingsLocked}
            onDirectionChange={setTranslationDirection}
          />

          <div className="border-t border-slate-200 pt-8 space-y-8">
            <AudioInputSourceCard
              selectedSource={audioInputSource}
              selectedDeviceId={micDeviceId}
              disabled={settingsLocked}
              onSourceChange={(source) => {
                void setAudioInputSource(source);
              }}
              onDeviceChange={setMicDeviceId}
            />

            <AudioOutputDeviceCard
              selectedDeviceId={outputDeviceId}
              outputVolume={outputVolume}
              disabled={settingsLocked}
              onDeviceChange={setOutputDeviceId}
              onVolumeChange={setOutputVolume}
              outputLanguageLabel={outputLanguageLabel}
            />
          </div>

          <p className="text-xs text-slate-500 border-t border-slate-200 pt-4">
            Stop translation before changing devices or direction. Volume can
            be adjusted anytime. Connect a 3.5 mm cable from audio out to the
            TT125-TX MIC port.
          </p>
        </section>

        <TranslationSetupSummary
          directionLabel={formatAudioTranslationDirectionLabel(
            translationDirection,
            translationDirection === "auto" ? resolvedDirection : null,
            sessionStatus === "live" &&
              translationDirection === "auto" &&
              !resolvedDirection
          )}
          inputSourceLabel={audioInputSourceLabel}
          inputDeviceLabel={inputDeviceLabel}
          outputDeviceLabel={outputDeviceLabel}
          isRouting={sessionStatus === "live" && isTranslating}
        />

        <AudioTranslationStatusCard
          status={sessionStatus}
          seconds={seconds}
          autoReconnectsUsed={autoReconnectsUsed}
          error={translationError}
          onStart={() => {
            setSeconds(0);
            void startListening("user");
          }}
          onStop={() => {
            setSeconds(0);
            stopListening();
          }}
        />

        <AudioMonitorCard
          status={sessionStatus}
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
        />
      </div>
    </main>
  );
}
