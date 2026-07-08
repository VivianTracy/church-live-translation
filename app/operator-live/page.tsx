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
import {
  clearTranslationListenState,
  saveTranslationListenState,
} from "@/lib/translationListenApi";
import { useEffect, useState } from "react";

export default function OperatorLivePage() {
  const [isLive, setIsLive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [relayError, setRelayError] = useState("");
  const [relayReady, setRelayReady] = useState<boolean | null>(null);
  const [showLocalOperatorWarning, setShowLocalOperatorWarning] = useState(false);

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

  useEffect(() => {
    setShowLocalOperatorWarning(
      window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
    );

    void fetch("/api/translation-listen-state", { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as { relayConfigured?: boolean; error?: string };

        if (!response.ok) {
          setRelayReady(false);
          setRelayError(body.error ?? "Phone relay is unavailable.");
          return;
        }

        setRelayReady(body.relayConfigured !== false);
      })
      .catch(() => {
        setRelayReady(false);
        setRelayError("Could not check phone relay status.");
      });
  }, []);

  const markAudienceLive = async () => {
    await saveTranslationListenState({
      isLive: true,
      updatedAt: Date.now(),
    });
    setRelayError("");
  };

  const handleToggleLive = () => {
    const nextIsLive = !isLive;

    if (!nextIsLive) {
      setIsLive(false);
      stopListening();
      setSeconds(0);
      void clearTranslationListenState().catch((error) => {
        setRelayError(error instanceof Error ? error.message : String(error));
      });
      return;
    }

    setIsLive(true);
    void markAudienceLive().catch((error) => {
      setIsLive(false);
      setRelayError(error instanceof Error ? error.message : String(error));
    });
  };

  const handleStartListening = async () => {
    if (!(await startListening())) {
      return;
    }

    setIsLive(true);
    void markAudienceLive().catch((error) => {
      setRelayError(error instanceof Error ? error.message : String(error));
    });
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
            For phone listeners, run this page on your deployed Vercel URL, not
            localhost.
          </p>
        </section>

        {showLocalOperatorWarning ? (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
            You are on localhost. Phones opening the Vercel audience page cannot
            receive audio from this operator session. Use{" "}
            <span className="font-mono">https://church-caption.vercel.app/operator-live</span>{" "}
            during the service.
          </p>
        ) : null}

        {relayReady === false ? (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
            Phone relay is not configured. Add Redis/KV env vars on Vercel, then
            reload this page from the deployed site.
          </p>
        ) : null}

        {relayError ? (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
            Phone relay: {relayError}
          </p>
        ) : null}

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
