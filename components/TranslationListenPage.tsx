"use client";

import { parseChurchSlug } from "@/lib/churchSlug";
import {
  fetchTranslationAudioAfter,
  TranslationAudioChunkPlayer,
  unlockMobileAudioPlayback,
} from "@/lib/translationAudioPlayback";
import { loadTranslationListenState } from "@/lib/translationListenApi";
import {
  liveListenCursor,
  nextListenCursor,
  readRecentLiveHint,
  writeLiveHint,
} from "@/lib/translationListenCursor";
import {
  EMPTY_TRANSLATION_LISTEN_STATE,
  isTranslationSessionLive,
} from "@/types/translationListen";
import { useEffect, useRef, useState } from "react";

const LATEST_AUDIO_SEQUENCE = Number.MAX_SAFE_INTEGER;
const STOP_AFTER_NOT_LIVE_MS = 12000;
const NOT_LIVE_CONFIRMATIONS = 3;

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
  const resyncRef = useRef(false);
  const notLiveCountRef = useRef(0);
  const playerRef = useRef<TranslationAudioChunkPlayer | null>(null);
  const unlockedAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (parsedSlug && readRecentLiveHint(parsedSlug)) {
      setState({ isLive: true, updatedAt: Date.now() });
    }
  }, [parsedSlug]);

  useEffect(() => {
    if (!parsedSlug) {
      return;
    }

    const loadState = async () => {
      try {
        const [listenResult, audioResult] = await Promise.allSettled([
          loadTranslationListenState(parsedSlug),
          fetchTranslationAudioAfter(parsedSlug, LATEST_AUDIO_SEQUENCE),
        ]);

        if (
          listenResult.status === "rejected" &&
          audioResult.status === "rejected"
        ) {
          setStateError("Could not reach translation. Retrying…");
          return;
        }

        const listenState =
          listenResult.status === "fulfilled"
            ? listenResult.value
            : EMPTY_TRANSLATION_LISTEN_STATE;
        const audioMeta =
          audioResult.status === "fulfilled"
            ? audioResult.value.meta
            : { isLive: false, updatedAt: 0, latestSeq: 0, mimeType: "audio/wav" };
        const isLive = isTranslationSessionLive(listenState, audioMeta);

        if (isLive) {
          notLiveCountRef.current = 0;
          writeLiveHint(parsedSlug, true);
          setState({
            isLive: true,
            updatedAt: Math.max(listenState.updatedAt, audioMeta.updatedAt),
          });
        } else {
          notLiveCountRef.current += 1;
          if (notLiveCountRef.current >= NOT_LIVE_CONFIRMATIONS) {
            writeLiveHint(parsedSlug, false);
            setState({
              isLive: false,
              updatedAt: Math.max(listenState.updatedAt, audioMeta.updatedAt),
            });
          }
        }

        if (listenResult.status === "fulfilled") {
          setChurchName(listenResult.value.churchName || initialChurchName);
        }
        setStateError("");
      } catch (error) {
        setStateError(
          error instanceof Error
            ? error.message
            : "Could not reach translation. Retrying…"
        );
      }
    };

    void loadState();
    const timer = setInterval(loadState, 1500);
    const retryNow = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      void loadState();
      void playerRef.current?.resume();
    };

    window.addEventListener("online", retryNow);
    window.addEventListener("visibilitychange", retryNow);
    window.addEventListener("pageshow", retryNow);

    return () => {
      clearInterval(timer);
      window.removeEventListener("online", retryNow);
      window.removeEventListener("visibilitychange", retryNow);
      window.removeEventListener("pageshow", retryNow);
    };
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
        if (resyncRef.current) {
          const liveEdge = await fetchTranslationAudioAfter(
            parsedSlug,
            LATEST_AUDIO_SEQUENCE
          );

          if (cancelled) {
            return;
          }

          lastSeqRef.current = liveListenCursor(liveEdge.meta.latestSeq);
          resyncRef.current = false;
        }

        const payload = await fetchTranslationAudioAfter(
          parsedSlug,
          lastSeqRef.current
        );

        if (cancelled) {
          return;
        }

        if (payload.meta.isLive || payload.meta.latestSeq > 0) {
          notLiveCountRef.current = 0;
          writeLiveHint(parsedSlug, true);
          setState({
            isLive: true,
            updatedAt: payload.meta.updatedAt,
          });
        }

        const playFrom = nextListenCursor(
          lastSeqRef.current,
          payload.meta.latestSeq
        );

        if (playFrom > lastSeqRef.current) {
          lastSeqRef.current = playFrom;
        }

        const chunks = payload.chunks.filter((chunk) => chunk.seq > playFrom);
        await playerRef.current?.resume();

        for (const chunk of chunks) {
          playerRef.current?.enqueue(chunk);
          lastSeqRef.current = Math.max(lastSeqRef.current, chunk.seq);
        }

        if (chunks.length > 0) {
          setChunksReceived((count) => count + chunks.length);
        }

        if (playerRef.current?.lastError) {
          setPlaybackError(playerRef.current.lastError);
        } else {
          setPlaybackError("");
        }
      } catch (error) {
        if (!cancelled) {
          resyncRef.current = true;
          setPlaybackError(
            error instanceof Error
              ? "Connection dropped. Reconnecting…"
              : "Could not load audio."
          );
        }
      } finally {
        polling = false;
      }
    };

    void pollAudio();
    const timer = setInterval(pollAudio, 500);
    const retryNow = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      resyncRef.current = true;
      void playerRef.current?.resume();
      void pollAudio();
    };

    window.addEventListener("online", retryNow);
    window.addEventListener("visibilitychange", retryNow);

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("online", retryNow);
      window.removeEventListener("visibilitychange", retryNow);
    };
  }, [isPlaying, parsedSlug]);

  useEffect(() => {
    if (state.isLive || !isPlaying) {
      return;
    }

    const timer = window.setTimeout(() => {
      playerRef.current?.stop();
      setIsPlaying(false);
      lastSeqRef.current = 0;
    }, STOP_AFTER_NOT_LIVE_MS);

    return () => window.clearTimeout(timer);
  }, [state.isLive, isPlaying]);

  const handleStartListening = async () => {
    if (!parsedSlug) {
      return;
    }

    unlockedAudioRef.current = unlockMobileAudioPlayback();
    setPlaybackError("");
    setChunksReceived(0);
    resyncRef.current = false;
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

      try {
        const payload = await fetchTranslationAudioAfter(
          parsedSlug,
          LATEST_AUDIO_SEQUENCE
        );
        lastSeqRef.current = liveListenCursor(payload.meta.latestSeq);
      } catch {
        lastSeqRef.current = 0;
        resyncRef.current = true;
      }

      setIsPlaying(true);
    } catch (error) {
      setPlaybackError(
        error instanceof Error
          ? error.message
          : "Could not start audio on this phone."
      );
    }
  };

  const listenDisabled = !parsedSlug || (!state.isLive && !isPlaying);
  const listenLabel = playbackError
    ? "Tap to Resume"
    : isPlaying
      ? "Listening…"
      : "Tap to Listen";

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
          disabled={listenDisabled}
          className={`rounded-2xl px-8 py-6 text-2xl font-bold ${
            listenDisabled
              ? "cursor-not-allowed bg-zinc-700 text-zinc-400"
              : "bg-emerald-600 text-white hover:bg-emerald-500"
          }`}
        >
          {listenLabel}
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
          Keep this page open. If the sound stops after switching Wi‑Fi or data,
          tap Listen again.
        </p>
      </div>
    </main>
  );
}
