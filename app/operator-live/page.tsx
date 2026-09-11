"use client";

import { AudioInputSourceCard } from "@/components/AudioInputSourceCard";
import { AudioMonitorCard } from "@/components/AudioMonitorCard";
import { AudioOutputDeviceCard } from "@/components/AudioOutputDeviceCard";
import { AudioTranslationStatusCard } from "@/components/AudioTranslationStatusCard";
import { ChurchTranslationHeader } from "@/components/ChurchTranslationHeader";
import { TranslationAudienceCard } from "@/components/TranslationAudienceCard";
import { TranslationDirectionCard } from "@/components/TranslationDirectionCard";
import { TranslationSetupSummary } from "@/components/TranslationSetupSummary";
import { formatAudioTranslationDirectionLabel } from "@/lib/audioTranslationDirection";
import { isOperatorSessionTiming } from "@/lib/operatorSessionState";
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
import { useAudioTranslationOperator } from "@/lib/useAudioTranslationOperator";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type OperatorAccount = {
  mode: "local" | "church";
  churchName: string | null;
  email: string | null;
};

export default function OperatorLivePage() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(0);
  const [account, setAccount] = useState<OperatorAccount | null>(null);
  const [accountError, setAccountError] = useState("");
  const [relayError, setRelayError] = useState("");
  const [relayReady, setRelayReady] = useState<boolean | null>(null);
  const [showMissingRelayConfig, setShowMissingRelayConfig] = useState(false);
  const [relayOrigin, setRelayOrigin] = useState<string | undefined>(undefined);
  const [usingRemoteRelay, setUsingRemoteRelay] = useState(false);
  const audienceWasActiveRef = useRef(false);

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
    audienceBroadcastError,
    chunksUploaded,
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
    void fetch("/api/operator/me", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          router.replace("/login?next=/operator-live");
          return;
        }

        const body = (await response.json()) as OperatorAccount & {
          error?: string;
        };

        if (response.status === 403) {
          setAccountError(
            body.error ?? "This account is not an authorized church operator."
          );
          return;
        }

        if (!response.ok) {
          setAccountError(body.error ?? "Could not confirm church sign-in.");
          return;
        }

        setAccount({
          mode: body.mode,
          churchName: body.churchName,
          email: body.email,
        });
        setAccountError("");
      })
      .catch(() => {
        setAccountError("Could not confirm church sign-in.");
      });
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRelayOrigin(getTranslationRelayOrigin());
      setUsingRemoteRelay(isUsingRemoteTranslationRelay());
      setShowMissingRelayConfig(
        isLocalDevHostname(window.location.hostname) &&
          !getTranslationRelayOrigin()
      );
    }, 0);

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
            : "Phone relay status unavailable. Headset audio still works."
        );
      });

    return () => window.clearTimeout(timer);
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
            : "Phone relay: Failed to save listen state."
        );
      });
  }, []);

  useEffect(() => {
    const audienceActive =
      sessionStatus === "live" ||
      sessionStatus === "connecting" ||
      sessionStatus === "reconnecting";

    if (audienceActive) {
      audienceWasActiveRef.current = true;
      markAudienceLive();
      const timer = setInterval(markAudienceLive, 5000);
      return () => clearInterval(timer);
    }

    if (
      audienceWasActiveRef.current &&
      (sessionStatus === "off" || sessionStatus === "failed")
    ) {
      audienceWasActiveRef.current = false;
      void clearTranslationListenState().catch((error) => {
        setRelayError(
          error instanceof Error
            ? `Phone relay: ${error.message}`
            : "Phone relay: Failed to clear listen state."
        );
      });
    }
  }, [markAudienceLive, sessionStatus]);

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
        <ChurchTranslationHeader
          churchName={account?.churchName}
          email={account?.email}
          showSignOut={account?.mode === "church"}
        />

        {accountError ? (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
            {accountError}
          </p>
        ) : null}

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

        {showMissingRelayConfig ? (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
            Add{" "}
            <span className="font-mono">
              NEXT_PUBLIC_AUDIENCE_URL=https://church-caption.vercel.app
            </span>{" "}
            to <span className="font-mono">.env.local</span> and restart so the
            QR code stays permanent for phones.
          </p>
        ) : null}

        {usingRemoteRelay && relayOrigin ? (
          <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
            Phone QR points to{" "}
            <span className="font-mono">{relayOrigin}/listen</span>.
          </p>
        ) : null}

        {relayReady === false ? (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
            Vercel has the keys in Settings, but the running deploy cannot see
            them yet. Headset translation still works. Open{" "}
            <span className="font-medium">Deployments</span>, click{" "}
            <span className="font-medium">Redeploy</span>, and uncheck{" "}
            <span className="font-medium">Use existing Build Cache</span>.
          </p>
        ) : null}

        {relayError ? (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
            {relayError}
          </p>
        ) : null}

        <TranslationAudienceCard />

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
          error={translationError || audienceBroadcastError}
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
          translationError={translationError || audienceBroadcastError}
        />

        {sessionStatus === "live" && isTranslating && chunksUploaded > 0 ? (
          <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
            Phone relay active: {chunksUploaded} audio chunks sent.
          </p>
        ) : null}

        {sessionStatus === "live" && isTranslating && chunksUploaded === 0 ? (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
            Translation is playing locally, but no chunks have reached the phone
            relay yet. If this stays at 0, check that{" "}
            <span className="font-mono">https://church-caption.vercel.app</span>{" "}
            is online.
          </p>
        ) : null}
      </div>
    </main>
  );
}
