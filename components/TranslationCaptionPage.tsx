"use client";

import { parseChurchSlug } from "@/lib/churchSlug";
import { loadTranslationCaptions } from "@/lib/translationCaptionBroadcast";
import {
  mergeCaptionLines,
  type CaptionLine,
  type CaptionTrack,
} from "@/lib/translationCaptionTrack";
import { useEffect, useRef, useState } from "react";

const TRACK_COPY: Record<
  CaptionTrack,
  { en: string; zh: string; waiting: string; waitingZh: string }
> = {
  original: {
    en: "Original",
    zh: "原文",
    waiting: "Waiting for the sermon…",
    waitingZh: "等待讲道开始…",
  },
  translation: {
    en: "Translation",
    zh: "翻译",
    waiting: "Waiting for the translation…",
    waitingZh: "等待翻译开始…",
  },
};

type TranslationCaptionPageProps = {
  churchSlug: string;
  track: CaptionTrack;
  churchName?: string;
};

function captionErrorMessage(message: string): string {
  if (message.includes("not for a known church")) {
    return "This caption link is not for a known church.";
  }

  if (message.includes("church is required")) {
    return "This caption link is missing the church.";
  }

  return message;
}

export function TranslationCaptionPage({
  churchSlug,
  track,
  churchName: initialChurchName = "",
}: TranslationCaptionPageProps) {
  const parsedSlug = parseChurchSlug(churchSlug);
  const copy = TRACK_COPY[track];
  const [churchName, setChurchName] = useState(initialChurchName);
  const [lines, setLines] = useState<CaptionLine[]>([]);
  const [partial, setPartial] = useState("");
  const [languageLabel, setLanguageLabel] = useState("");
  const [languageCode, setLanguageCode] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [phase, setPhase] = useState<"loading" | "ready">("loading");
  const [loadError, setLoadError] = useState(
    parsedSlug ? "" : "This caption link is not for a known church."
  );
  const lastSeqRef = useRef(0);
  const stickToBottomRef = useRef(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const latestLine = lines[lines.length - 1]?.text ?? "";

  useEffect(() => {
    const onScroll = () => {
      const distance =
        document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      stickToBottomRef.current = distance < 120;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!stickToBottomRef.current) {
      return;
    }

    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
    bottomRef.current?.scrollIntoView({ block: "end", behavior });
  }, [lines, partial]);

  useEffect(() => {
    if (!isLive || !("wakeLock" in navigator)) {
      return;
    }

    let cancelled = false;
    let lock: WakeLockSentinel | null = null;

    const requestLock = () => {
      void navigator.wakeLock
        .request("screen")
        .then((sentinel) => {
          if (cancelled) {
            void sentinel.release();
            return;
          }

          lock = sentinel;
        })
        .catch(() => undefined);
    };

    requestLock();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        requestLock();
      }
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, [isLive]);

  useEffect(() => {
    if (!parsedSlug) {
      return;
    }

    let cancelled = false;
    let polling = false;

    const poll = async () => {
      if (polling || cancelled) {
        return;
      }

      polling = true;

      try {
        const feed = await loadTranslationCaptions(
          parsedSlug,
          track,
          lastSeqRef.current
        );

        if (cancelled) {
          return;
        }

        if (feed.churchName) {
          setChurchName(feed.churchName);
        }

        setLanguageLabel(feed.languageLabel);
        setLanguageCode(feed.languageCode);
        setIsLive(feed.isLive);
        setLoadError("");
        setPhase("ready");

        if (feed.latestSeq < lastSeqRef.current) {
          lastSeqRef.current = 0;
          setLines([]);
          setPartial(feed.partial);
          return;
        }

        setPartial(feed.partial);
        setLines((current) => mergeCaptionLines(current, feed.lines));
        lastSeqRef.current = feed.latestSeq;
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            captionErrorMessage(
              error instanceof Error ? error.message : "Could not load captions."
            )
          );
          setPhase("ready");
        }
      } finally {
        polling = false;
      }
    };

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, 500);

    const retryNow = () => {
      void poll();
    };

    window.addEventListener("online", retryNow);
    window.addEventListener("visibilitychange", retryNow);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("online", retryNow);
      window.removeEventListener("visibilitychange", retryNow);
    };
  }, [parsedSlug, track]);

  const showTranscript = lines.length > 0 || partial.length > 0;
  const captionLanguage = /^[a-z]{2,8}$/.test(languageCode) ? languageCode : undefined;

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-stone-950/95 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-400">
              {copy.zh} · {copy.en}
            </p>
            <h1 className="mt-1 text-2xl font-bold">
              {churchName || "Church Translation"}
            </h1>
            {languageLabel ? (
              <p className="mt-1 text-lg text-zinc-200">{languageLabel}</p>
            ) : null}
          </div>
          <p
            className={`pt-1 text-sm font-bold tracking-widest ${
              isLive ? "text-emerald-400" : "text-zinc-400"
            }`}
          >
            {phase === "loading" ? "…" : isLive ? "LIVE" : "WAITING"}
          </p>
        </div>
      </header>

      <div
        className="mx-auto w-full max-w-3xl px-5 pt-8 pb-[max(3rem,env(safe-area-inset-bottom))]"
        lang={captionLanguage}
        style={{
          fontFamily:
            '"PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", "Segoe UI", sans-serif',
        }}
      >
        <p className="sr-only" aria-live="polite">
          {latestLine}
        </p>

        {showTranscript ? (
          <div className="space-y-6">
            {lines.map((line) => (
              <p
                key={line.seq}
                className="text-3xl leading-snug text-zinc-300 sm:text-4xl sm:leading-normal"
              >
                {line.text}
              </p>
            ))}
            {partial ? (
              <p className="text-4xl leading-snug font-semibold text-white sm:text-5xl">
                {partial}
              </p>
            ) : null}
          </div>
        ) : (
          <div>
            <p className="text-3xl leading-snug text-zinc-300">
              {phase === "loading"
                ? "Loading captions…"
                : isLive
                  ? "Listening…"
                  : copy.waiting}
            </p>
            {phase === "ready" ? (
              <p className="mt-3 text-2xl text-zinc-500">
                {isLive ? "正在听…" : copy.waitingZh}
              </p>
            ) : null}
          </div>
        )}

        {loadError ? (
          <p className="mt-8 rounded-2xl bg-red-950 px-4 py-3 text-sm text-red-200">
            {loadError}
          </p>
        ) : null}

        <div ref={bottomRef} />
      </div>
    </main>
  );
}
