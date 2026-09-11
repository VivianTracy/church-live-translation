"use client";

import { parseChurchSlug } from "@/lib/churchSlug";
import {
  fetchTranslationAudioAfter,
  TranslationAudioChunkPlayer,
  unlockMobileAudioPlayback,
} from "@/lib/translationAudioPlayback";
import { loadTranslationListenState } from "@/lib/translationListenApi";
import {
  EMPTY_TRANSLATION_LISTEN_STATE,
  isTranslationSessionLive,
} from "@/types/translationListen";
import { useEffect, useRef, useState } from "react";

const LATEST_AUDIO_SEQUENCE = Number.MAX_SAFE_INTEGER;

type TranslationListenPageProps = {
  churchSlug: string;
  churchName?: string;
};

export function TranslationListenPage({
  churchSlug,
  churchName: initialChurchName = "",
}: TranslationListenPageProps) {
  const parsedSlug = parseChurchSlug(churchSlug);
  const [state, setState] = useState(EMPTY_TRANSLATION_LISTEN_STATE);
  const [churchName, setChurchName] = useState(initialChurchName);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState("");
  const [stateError, setStateError] = useState(
    parsedSlug ? "" : "This listener link is not for a known church."
  );
  const [chunksReceived, setChunksReceived] = useState(0);
  const lastSeqRef = useRef(0);
  const playerRef = useRef<TranslationAudioChunkPlayer | null>(null);
  const unlockedAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!parsedSlug) {
      return;
    }

    const loadState = async () => {
      try {
        const listenState = await loadTranslationListenState(parsedSlug);
        const payload = await fetchTranslationAudioAfter(
          parsedSlug,
          LATEST_AUDIO_SEQUENCE
        );
        const isLive = isTranslationSessionLive(listenState, payload.meta);

        setState({
          isLive,
          updatedAt: Math.max(listenState.updatedAt, payload.meta.updatedAt),
        });
        setChurchName(listenState.churchName || initialChurchName);
        setStateError("");
      } catch (error) {
        setStateError(
          error instanceof Error
            ? error.message
            : "Could not reach translation service."
        );
      }
    };

    void loadState();
    const timer = setInterval(loadState, 1500);

    return () => clearInterval(timer);
  }, [initialChurchName, parsedSlug]);

  useEffect(() => {
    if (!isPlaying || !parsedSlug) {
      return;
    }

    let cancelled = false;
    let polling = false;

    const pollAudio = async () => {
      if (polling) {
        return;
      }

      polling = true;

      try {
        const payload = await fetchTranslationAudioAfter(
          parsedSlug,
          lastSeqRef.current
        );

        if (cancelled) {
          return;
        }

        if (payload.meta.isLive || payload.meta.latestSeq > 0) {
          setState({
            isLive: true,
            updatedAt: payload.meta.updatedAt,
          });
        }

        for (const chunk of payload.chunks) {
          playerRef.current?.enqueue(chunk);
          lastSeqRef.current = Math.max(lastSeqRef.current, chunk.seq);
        }

        if (payload.chunks.length > 0) {
          setChunksReceived((count) => count + payload.chunks.length);
        }

        if (playerRef.current?.lastError) {
          setPlaybackError(playerRef.current.lastError);
        } else {
          setPlaybackError("");
        }
      } catch (error) {
        if (!cancelled) {
          setPlaybackError(
            error instanceof Error ? error.message : "Could not load audio."
          );
        }
      } finally {
        polling = false;
      }
    };

    void pollAudio();
    const timer = setInterval(pollAudio, 500);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isPlaying, parsedSlug]);

  useEffect(() => {
    if (!state.isLive && isPlaying) {
      const timer = window.setTimeout(() => {
        playerRef.current?.stop();
        setIsPlaying(false);
        lastSeqRef.current = 0;
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [state.isLive, isPlaying]);

  const handleStartListening = async () => {
    if (!parsedSlug) {
      return;
    }

    unlockedAudioRef.current = unlockMobileAudioPlayback();
    setPlaybackError("");
    setChunksReceived(0);
    playerRef.current?.reset(unlockedAudioRef.current);
    playerRef.current ??= new TranslationAudioChunkPlayer(
      unlockedAudioRef.current
    );
    playerRef.current.onError = (message) => {
      setPlaybackError(message);
    };

    try {
      // Start Web Audio while this click still counts as a user gesture on iOS.
      await playerRef.current.prepare();

      // Join the live edge instead of replaying Redis's retained audio history.
      const payload = await fetchTranslationAudioAfter(
        parsedSlug,
        LATEST_AUDIO_SEQUENCE
      );
      lastSeqRef.current = payload.meta.latestSeq;
      setIsPlaying(true);
    } catch (error) {
      setPlaybackError(
        error instanceof Error
          ? error.message
          : "Could not start audio on this phone."
      );
    }
  };

  return (
    <main className="min-h-screen bg-stone-950 px-5 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center gap-8 text-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-400">
            Church Translation
          </p>
          <h1 className="mt-2 text-3xl font-bold">Live translation</h1>
          <p className="mt-2 text-zinc-400">
            {churchName || "教会翻译 · 点击收听"}
          </p>
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
          onClick={() => {
            void handleStartListening();
          }}
          disabled={!parsedSlug || !state.isLive || isPlaying}
          className={`rounded-2xl px-8 py-6 text-2xl font-bold ${
            !parsedSlug || !state.isLive || isPlaying
              ? "cursor-not-allowed bg-zinc-700 text-zinc-400"
              : "bg-emerald-600 text-white hover:bg-emerald-500"
          }`}
        >
          {isPlaying ? "Listening…" : "Tap to Listen"}
        </button>

        {stateError ? (
          <p className="rounded-2xl bg-red-950 px-4 py-3 text-sm text-red-200">
            {stateError}
          </p>
        ) : null}

        {isPlaying && chunksReceived === 0 ? (
          <p className="text-sm text-zinc-400">
            Waiting for audio from the operator…
          </p>
        ) : null}

        {isPlaying && chunksReceived > 0 ? (
          <p className="text-sm text-emerald-400">
            Receiving live translation audio.
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
