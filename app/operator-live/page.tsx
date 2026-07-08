"use client";

import { AudioMonitorCard } from "@/components/AudioMonitorCard";
import { AudioOperatorRelatedPagesCard } from "@/components/AudioOperatorRelatedPagesCard";
import { AudioOutputDeviceCard } from "@/components/AudioOutputDeviceCard";
import { AudioTranslationStatusCard } from "@/components/AudioTranslationStatusCard";
import { CaptionSettingsLinkCard } from "@/components/CaptionSettingsLinkCard";
import { Header } from "@/components/Header";
import { MicrophoneDeviceCard } from "@/components/MicrophoneDeviceCard";
import { OutputModeCard } from "@/components/OutputModeCard";
import { TranslationChannelCard } from "@/components/TranslationChannelCard";
import { useAudioTranslationOperator } from "@/lib/useAudioTranslationOperator";
import {
  outputModeIncludesAudio,
  outputModeIncludesCaptions,
} from "@/lib/outputModeStorage";
import { useEffect, useState } from "react";

export default function OperatorLivePage() {
  const [isLive, setIsLive] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const {
    outputMode,
    setOutputMode,
    isListening,
    isTranslating,
    isAudioTranslating,
    micDeviceId,
    setMicDeviceId,
    outputDeviceId,
    setOutputDeviceId,
    outputDeviceLabel,
    micError,
    translationError,
    captionError,
    latencyMs,
    inputLevel,
    inputPeak,
    outputLevel,
    outputPeak,
    translationStatusLabel,
    micTranscript,
    englishCaption,
    englishCaptionUpdatedAt,
    startListening,
    stopListening,
    restartListening,
    startBroadcast,
    clearBroadcast,
  } = useAudioTranslationOperator();

  const includesAudio = outputModeIncludesAudio(outputMode);
  const includesCaptions = outputModeIncludesCaptions(outputMode);

  const handleToggleLive = async () => {
    const nextIsLive = !isLive;
    setIsLive(nextIsLive);

    if (nextIsLive) {
      if (includesCaptions) {
        await startBroadcast();
      }
      return;
    }

    stopListening();
    if (includesCaptions) {
      await clearBroadcast();
    }
    setSeconds(0);
  };

  const handleStartListening = async () => {
    if (await startListening()) {
      if (!isLive) {
        setIsLive(true);
        if (includesCaptions) {
          await startBroadcast();
        }
      }
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

  const liveStatusHint =
    outputMode === "captions"
      ? "Captions broadcasting"
      : outputMode === "audio"
        ? "Translation channel active"
        : "Captions and audio active";

  const startLiveLabel =
    outputMode === "captions"
      ? "🟢 Start Live Captions"
      : outputMode === "audio"
        ? "🟢 Start Live Translation"
        : "🟢 Start Live Output";

  const stopLiveLabel =
    outputMode === "captions"
      ? "🔴 Stop Live Captions"
      : outputMode === "audio"
        ? "🔴 Stop Live Translation"
        : "🔴 Stop Live Output";

  const monitorInputStatus = includesCaptions
    ? "Receiving Chinese audio for captions"
    : "Receiving Chinese audio";

  const monitorOutputStatus = includesAudio
    ? includesCaptions
      ? isAudioTranslating
        ? "Sending audio and captions"
        : "Sending captions"
      : "Sending English audio"
    : "Publishing captions to overlay";

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-8">
        <Header />

        <section className="rounded-3xl border border-violet-200 bg-violet-50 p-6 text-sm text-violet-950 space-y-3">
          <p className="text-sm font-bold tracking-widest text-violet-800">
            LIVE OUTPUT OPERATOR
          </p>
          <p className="text-base font-semibold">
            Run earpiece audio, YouTube captions, or both from one page.
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-violet-900">
            <li>Choose output mode: Audio, Captions, or Both.</li>
            <li>Select Chinese sermon audio input (BlackHole from OBS).</li>
            <li>
              {includesAudio
                ? "Select the translation channel output for earpiece listeners."
                : "Open Caption Settings and confirm OBS points to /overlay."}
            </li>
            <li>Press Start Live, then Start Audio Input.</li>
          </ol>
          <p className="text-xs text-violet-800">
            Caption-only workflow with sermon transcripts is on{" "}
            <span className="font-mono">/operator-caption</span>.
          </p>
        </section>

        <AudioOperatorRelatedPagesCard showCaptionPages={includesCaptions} />

        <OutputModeCard
          mode={outputMode}
          disabled={isListening}
          onModeChange={setOutputMode}
        />

        {includesAudio ? (
          <TranslationChannelCard
            isRouting={isLive && isAudioTranslating}
            outputDeviceLabel={outputDeviceLabel}
          />
        ) : null}

        <MicrophoneDeviceCard
          selectedDeviceId={micDeviceId}
          disabled={isListening}
          onDeviceChange={setMicDeviceId}
        />

        {includesAudio ? (
          <AudioOutputDeviceCard
            selectedDeviceId={outputDeviceId}
            disabled={isListening}
            onDeviceChange={setOutputDeviceId}
          />
        ) : null}

        <AudioTranslationStatusCard
          isLive={isLive}
          isListening={isListening}
          seconds={seconds}
          statusHint={liveStatusHint}
          startLabel={startLiveLabel}
          stopLabel={stopLiveLabel}
          onToggleLive={() => {
            void handleToggleLive();
          }}
        />

        <AudioMonitorCard
          isListening={isListening}
          isTranslating={isTranslating}
          inputLevel={inputLevel}
          inputPeak={inputPeak}
          outputLevel={outputLevel}
          outputPeak={outputPeak}
          latencyMs={includesAudio ? latencyMs : null}
          micTranscript={includesCaptions ? micTranscript : undefined}
          englishCaption={includesCaptions ? englishCaption : undefined}
          englishCaptionUpdatedAt={
            includesCaptions ? englishCaptionUpdatedAt : undefined
          }
          showAudioOutput={includesAudio}
          showCaptions={includesCaptions}
          translationStatusLabel={translationStatusLabel}
          inputStatusLabel={monitorInputStatus}
          translationStatusText={monitorOutputStatus}
          micError={micError}
          translationError={translationError}
          captionError={includesCaptions ? captionError : undefined}
          onStartListening={() => {
            void handleStartListening();
          }}
          onStopListening={stopListening}
          onRestartListening={() => {
            void restartListening();
          }}
        />

        {includesCaptions ? <CaptionSettingsLinkCard /> : null}
      </div>
    </main>
  );
}
