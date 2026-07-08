"use client";

import { CURRENT_SERVICE } from "@/lib/service";
import {
  fetchTranslationAudioAfter,
  TranslationAudioChunkPlayer,
} from "@/lib/translationAudioPlayback";
import { loadTranslationListenState } from "@/lib/translationListenApi";
import { EMPTY_TRANSLATION_LISTEN_STATE } from "@/types/translationListen";
import { useEffect, useRef, useState } from "react";

export default function ListenPage() {
  const [state, setState] = useState(EMPTY_TRANSLATION_LISTEN_STATE);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState("");
  const [stateError, setStateError] = useState("");
  const lastSeqRef = useRef(0);
  const playerRef = useRef<TranslationAudioChunkPlayer | null>(null);

  useEffect(() => {
    const loadState = async () => {
      try {
        const listenState = await loadTranslationListenState();
        setState(listenState);
        setStateError("");

        if (!listenState.isLive) {
          const payload = await fetchTranslationAudioAfter(0);

          if (payload.meta.isLive) {
            setState({
              isLive: true,
              updatedAt: payload.meta.updatedAt,
            });
          }
        }
      } catch (error) {
        setStateError(
          error instanceof Error ? error.message : "Could not reach translation service."
        );
      }
    };

    void loadState();
    const timer = setInterval(loadState, 1500);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    let cancelled = false;

    const pollAudio = async () => {
      try {
        const payload = await fetchTranslationAudioAfter(lastSeqRef.current);

        if (cancelled) {
          return;
        }

        if (payload.meta.isLive) {
          setState({
            isLive: true,
            updatedAt: payload.meta.updatedAt,
          });
        }

        for (const chunk of payload.chunks) {
          playerRef.current?.enqueue(chunk);
          lastSeqRef.current = chunk.seq;
        }

        setPlaybackError("");
      } catch (error) {
        if (!cancelled) {
          setPlaybackError(
            error instanceof Error ? error.message : "Could not load audio."
          );
        }
      }
    };

    void pollAudio();
    const timer = setInterval(pollAudio, 500);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isPlaying]);

  useEffect(() => {
    if (!state.isLive && isPlaying) {
      playerRef.current?.stop();
      setIsPlaying(false);
      lastSeqRef.current = 0;
    }
  }, [state.isLive, isPlaying]);

  const handleStartListening = () => {
    setPlaybackError("");
    lastSeqRef.current = 0;
    playerRef.current?.reset();
    playerRef.current ??= new TranslationAudioChunkPlayer();
    setIsPlaying(true);
  };

  return (
    <main className="min-h-screen bg-stone-950 px-5 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center gap-8 text-center">
        <div>
          <p className="text-sm text-zinc-400">{CURRENT_SERVICE.churchName}</p>
          <h1 className="mt-2 text-3xl font-bold">English Translation</h1>
        </div>

        <div className="rounded-3xl bg-zinc-900 p-6 ring-1 ring-zinc-800">
          <p className="text-sm font-bold tracking-widest text-zinc-400">
            {state.isLive ? "LIVE" : "WAITING"}
          </p>
          <p className="mt-3 text-zinc-300">
            {state.isLive
              ? "Use headphones and tap the button below."
              : "Waiting for the operator to start live translation…"}
          </p>
        </div>

        <button
          type="button"
          onClick={handleStartListening}
          disabled={!state.isLive || isPlaying}
          className={`rounded-2xl px-8 py-6 text-2xl font-bold ${
            !state.isLive || isPlaying
              ? "cursor-not-allowed bg-zinc-700 text-zinc-400"
              : "bg-violet-600 text-white hover:bg-violet-500"
          }`}
        >
          {isPlaying ? "Listening…" : "Tap to Listen"}
        </button>

        {stateError ? (
          <p className="rounded-2xl bg-red-950 px-4 py-3 text-sm text-red-200">
            {stateError}
          </p>
        ) : null}

        {playbackError ? (
          <p className="rounded-2xl bg-red-950 px-4 py-3 text-sm text-red-200">
            {playbackError}
          </p>
        ) : null}

        <p className="text-xs text-zinc-500">
          Keep this page open. Works on mobile data or church Wi‑Fi.
        </p>
      </div>
    </main>
  );
}
