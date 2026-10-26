"use client";

import { LiveUrlQrCode } from "@/components/LiveUrlQrCode";
import { getTranslationCaptionUrl } from "@/lib/audienceUrl";
import type { CaptionTrack } from "@/lib/translationCaptionTrack";
import { useEffect, useState } from "react";

type CaptionUrls = Record<CaptionTrack, string>;

type AudienceUrlResponse = {
  listenUrl?: string;
  captionUrls?: Partial<CaptionUrls>;
};

const CAPTION_LINKS: Array<{
  track: CaptionTrack;
  title: string;
  subtitle: string;
}> = [
  {
    track: "original",
    title: "Original",
    subtitle: "原文 · what was spoken",
  },
  {
    track: "translation",
    title: "Translation",
    subtitle: "翻译 · headset language",
  },
];

function captionUrlsFromListen(listenUrl: string): CaptionUrls | null {
  const marker = "/listen/";
  const index = listenUrl.lastIndexOf(marker);

  if (index < 0) {
    return null;
  }

  const slug = listenUrl.slice(index + marker.length).split(/[?#]/)[0] ?? "";

  if (!slug) {
    return null;
  }

  const origin = listenUrl.slice(0, index);

  return {
    original: `${origin}/captions/${slug}/original`,
    translation: `${origin}/captions/${slug}/translation`,
  };
}

export function TranslationCaptionCard() {
  const [urls, setUrls] = useState<CaptionUrls | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/audience-url")
      .then((response) => response.json() as Promise<AudienceUrlResponse>)
      .then((data) => {
        if (cancelled) {
          return;
        }

        if (data.captionUrls?.original && data.captionUrls.translation) {
          setUrls({
            original: data.captionUrls.original,
            translation: data.captionUrls.translation,
          });
          return;
        }

        if (data.listenUrl) {
          setUrls(captionUrlsFromListen(data.listenUrl));
        }
      })
      .catch(() => {
        if (!cancelled && typeof window !== "undefined") {
          setUrls({
            original: getTranslationCaptionUrl(
              window.location.origin,
              "local",
              "original"
            ),
            translation: getTranslationCaptionUrl(
              window.location.origin,
              "local",
              "translation"
            ),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-5">
      <div className="text-center">
        <h2 className="text-base font-semibold text-slate-900">Read the sermon</h2>
        <p className="mt-1 text-sm text-slate-600">
          People who need to read can scan these. Headsets keep playing either
          way.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {CAPTION_LINKS.map((link) => {
          const url = urls?.[link.track] ?? "";

          return (
            <div key={link.track} className="space-y-3 text-center">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {link.title}
                </h3>
                <p className="mt-1 text-sm text-slate-600">{link.subtitle}</p>
              </div>
              {url ? (
                <LiveUrlQrCode url={url} size={168} />
              ) : (
                <div className="mx-auto h-[200px] w-[200px] animate-pulse rounded-2xl bg-slate-100" />
              )}
              {url ? (
                <a
                  href={url}
                  className="block rounded-2xl bg-slate-50 px-3 py-2 text-sm font-semibold text-emerald-800 break-all ring-1 ring-slate-200"
                  target="_blank"
                  rel="noreferrer"
                >
                  {url}
                </a>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
