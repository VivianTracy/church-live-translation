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
  loadTranslationRelayStatus,
  saveTranslationListenState,
} from "@/lib/translationListenApi";
import {
  getTranslationRelayOrigin,
  isLocalDevHostname,
  isUsingRemoteTranslationRelay,
} from "@/lib/translationRelayUrl";
import { useCallback, useEffect, useState } from "react";

export default function OperatorLivePage() {
  const [isLive, setIsLive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [relayError, setRelayError] = useState("");
  const [relayReady, setRelayReady] = useState<boolean | null>(null);
  const [showMissingRelayConfig, setShowMissingRelayConfig] = useState(false);
  const [relayOrigin, setRelayOrigin] = useState<string | undefined>(undefined);
  const [usingRemoteRelay, setUsingRemoteRelay] = useState(false);

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
    chunksUploaded,
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
    setRelayOrigin(getTranslationRelayOrigin());
    setUsingRemoteRelay(isUsingRemoteTranslationRelay());
    setShowMissingRelayConfig(
      isLocalDevHostname(window.location.hostname) && !getTranslationRelayOrigin()
    );

    void loadTranslationRelayStatus()
      .then((status) => {
        setRelayReady(status.relayConfigured);
        setRelayError("");
      })
      .catch((error) => {
        setRelayReady(null);
        setRelayError(
          error instanceof Error
            ? `Phone relay status unavailable: ${error.message}`
            : "Phone relay status unavailable. Local audio still works."
        );
      });
  }, []);

  const markAudienceLive = useCallback(() => {
    void saveTranslationListenState({
      isLive: true,
      updatedAt: Date.now(),
    })
      .then(() => {
        setRelayError("");
      })
      .catch((error) => {
        setRelayError(
          error instanceof Error
            ? `Phone relay: ${error.message}`
            : "Phone relay: Failed to save translation listen state."
        );
      });
  }, []);

  useEffect(() => {
    if (!isLive) {
      return;
    }

    markAudienceLive();
    const timer = setInterval(markAudienceLive, 5000);

    return () => clearInterval(timer);
  }, [isLive, markAudienceLive]);

  const handleToggleLive = () => {
    const nextIsLive = !isLive;

    if (!nextIsLive) {
      setIsLive(false);
      stopListening();
      setSeconds(0);
      void clearTranslationListenState().catch((error) => {
        setRelayError(
          error instanceof Error
            ? `Phone relay: ${error.message}`
            : "Phone relay: Failed to clear translation listen state."
        );
      });
      return;
    }

    setIsLive(true);
    markAudienceLive();
  };

  const handleStartListening = async () => {
    setIsLive(true);
    markAudienceLive();

    if (!(await startListening())) {
      setRelayError((current) => current || "Could not start audio input.");
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
            Run this page on the church computer. Local audio devices work from
            localhost; phone listeners use the deployed relay URL.
          </p>
        </section>

        {showMissingRelayConfig ? (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
            Add{" "}
            <span className="font-mono">NEXT_PUBLIC_AUDIENCE_URL=https://church-caption.vercel.app</span>{" "}
            to <span className="font-mono">.env.local</span>, restart{" "}
            <span className="font-mono">npm run dev</span>, then phones can
            receive audio while this operator runs locally.
          </p>
        ) : null}

        {usingRemoteRelay && relayOrigin ? (
          <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
            Local operator connected to phone relay at{" "}
            <span className="font-mono">{relayOrigin}</span>.
          </p>
        ) : null}

        {relayReady === false ? (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
            Phone relay is not configured on the deployed site. Local translation
            still works; add Redis/KV env vars on Vercel for phone listeners.
          </p>
        ) : null}

        {relayError ? (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
            {relayError}
          </p>
        ) : null}

        <TranslationAudienceCard />

        <AudioOperatorRelatedPagesCard />

        <TranslationChannelCard
          isRouting={isLive && isTranslating}
          outputDeviceLabel={outputDeviceLabel}
        />

        {isLive && isListening && chunksUploaded > 0 ? (
          <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
            Phone relay active: {chunksUploaded} audio chunks sent.
          </p>
        ) : null}

        {isLive && isListening && isTranslating && chunksUploaded === 0 ? (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
            Translation audio is playing locally, but no chunks have reached the
            phone relay yet. Wait a few seconds; if this stays at 0, check{" "}
            <span className="font-mono">NEXT_PUBLIC_AUDIENCE_URL</span> and the
            relay status message above.
          </p>
        ) : null}

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
