"use client";

import { AvReplayTestCard } from "@/components/AvReplayTestCard";
import { AudienceCard } from "@/components/AudienceCard";
import { Header } from "@/components/Header";
import { MicrophoneCard } from "@/components/MicrophoneCard";
import { StatusCard } from "@/components/StatusCard";
import { WhisperStatusCard } from "@/components/WhisperStatusCard";
import { saveCaptionState } from "@/lib/captionApi";
import { useOpenAIOperator } from "@/lib/useOpenAIOperator";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function OperatorOpenAIPage() {
  const [isLive, setIsLive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [showAvReplayTest, setShowAvReplayTest] = useState(false);

  const {
    translationStatusLabel,
    isListening,
    micTranscript,
    englishCaption,
    englishCaptionUpdatedAt,
    isTranslating,
    translationError,
    micError,
    lastTranslationMs,
    segmentCount,
    transcribedSegmentCount,
    whisperStatus,
    startMicrophone,
    stopMicrophone,
  } = useOpenAIOperator();

  const handleToggleLive = async () => {
    const nextIsLive = !isLive;
    setIsLive(nextIsLive);

    await saveCaptionState({
      isLive: nextIsLive,
      caption: nextIsLive ? englishCaption || "Live captions have started." : "",
      updatedAt: Date.now(),
    });
  };

  const handleStartMicrophone = async () => {
    if (await startMicrophone()) {
      setIsLive(true);
    }
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

        <section className="rounded-3xl border border-sky-200 bg-sky-50 p-6 text-sm text-sky-950 space-y-2">
          <p className="font-semibold">Experimental OpenAI operator</p>
          <p>
            Records 5-second audio chunks, transcribes with{" "}
            <span className="font-semibold">gpt-4o-mini-transcribe</span>, then
            translates with <span className="font-semibold">gpt-4o-mini</span>.
            Requires <code>OPENAI_API_KEY</code> in <code>.env.local</code>.
          </p>
          <p>
            Production operator:{" "}
            <Link href="/operator" className="font-semibold underline">
              /operator
            </Link>
          </p>
          <p>
            AV replay test:{" "}
            <Link href="/operator-openai?test=1" className="font-semibold underline">
              /operator-openai?test=1
            </Link>
          </p>
        </section>

        {showAvReplayTest ? (
          <AvReplayTestCard
            operatorPath="/operator-openai"
            transcriptionEngine="OpenAI gpt-4o-mini-transcribe (REST chunks)"
          />
        ) : null}

        <section className="rounded-3xl border border-violet-200 bg-violet-50 p-6 text-sm text-violet-950 space-y-2">
          <p className="font-semibold">OpenAI stack</p>
          <p>
            Status:{" "}
            <span className="font-semibold">{translationStatusLabel}</span>
          </p>
          <p>
            Segments transcribed:{" "}
            <span className="font-semibold">{transcribedSegmentCount}</span>
            {" · "}
            Segments translated:{" "}
            <span className="font-semibold">{segmentCount}</span>
          </p>
          {translationError && (
            <pre className="whitespace-pre-wrap rounded-2xl bg-white/70 p-3 text-xs font-semibold text-red-700">
              {translationError}
            </pre>
          )}
        </section>

        <WhisperStatusCard status={whisperStatus} />

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
          micNotice="Select BlackHole as the Chrome microphone for AV replay. Echo cancellation is disabled for virtual audio."
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
