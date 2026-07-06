"use client";

import { AudienceCard } from "@/components/AudienceCard";
import { Header } from "@/components/Header";
import { MicrophoneCard } from "@/components/MicrophoneCard";
import { SermonContextCard } from "@/components/SermonContextCard";
import { StatusCard } from "@/components/StatusCard";
import { saveCaptionState } from "@/lib/captionApi";
import { useOpenAIOperator } from "@/lib/useOpenAIOperator";
import Link from "next/link";
import { useState } from "react";

export default function OperatorOpenAIPage() {
  const [isLive, setIsLive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [translationSessionVersion, setTranslationSessionVersion] = useState(0);

  const {
    translationStatusLabel,
    isListening,
    micTranscript,
    isTranslating,
    translationError,
    micError,
    lastTranslationMs,
    liveCaption,
    startMicrophone,
    stopMicrophone,
  } = useOpenAIOperator(translationSessionVersion);

  const handleToggleLive = async () => {
    const nextIsLive = !isLive;
    setIsLive(nextIsLive);

    await saveCaptionState({
      isLive: nextIsLive,
      caption: nextIsLive ? "Live captions have started." : "",
      updatedAt: Date.now(),
    });
  };

  const handleStartMicrophone = async () => {
    if (await startMicrophone()) {
      setIsLive(true);
    }
  };

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-8">
        <Header />

        <section className="rounded-3xl border border-sky-200 bg-sky-50 p-6 text-sm text-sky-950 space-y-2">
          <p className="font-semibold">Experimental OpenAI operator</p>
          <p>
            Transcription uses{" "}
            <span className="font-semibold">gpt-realtime-whisper</span>. Translation
            uses <span className="font-semibold">gpt-realtime-2</span> over the
            Realtime API. Requires <code>OPENAI_API_KEY</code> in{" "}
            <code>.env.local</code>.
          </p>
          <p>
            Production operator:{" "}
            <Link href="/operator" className="font-semibold underline">
              /operator
            </Link>
          </p>
          <p>
            Setup guide: <code>docs/WHISPER_GPT_REALTIME.md</code> in the repo.
          </p>
        </section>

        <SermonContextCard
          onContextSaved={() => {
            setTranslationSessionVersion((value) => value + 1);
          }}
        />

        <section className="rounded-3xl border border-violet-200 bg-violet-50 p-6 text-sm text-violet-950 space-y-2">
          <p className="font-semibold">OpenAI Realtime stack</p>
          <p>
            Status:{" "}
            <span className="font-semibold">{translationStatusLabel}</span>
          </p>
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
        </section>

        <StatusCard
          isLive={isLive}
          isListening={isListening}
          seconds={seconds}
          onToggleLive={handleToggleLive}
        />

        <MicrophoneCard
          isListening={isListening}
          micTranscript={micTranscript}
          isTranslating={isTranslating}
          micError={micError}
          micNotice=""
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

        <AudienceCard />
      </div>
    </main>
  );
}
