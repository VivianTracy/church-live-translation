"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AudioOperatorRelatedPagesCardProps = {
  showCaptionPages?: boolean;
};

export function AudioOperatorRelatedPagesCard({
  showCaptionPages = true,
}: AudioOperatorRelatedPagesCardProps) {
  const [baseUrl, setBaseUrl] = useState("http://localhost:3000");

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-bold tracking-widest text-slate-500">
          OTHER PAGES
        </p>
        <p className="text-sm text-slate-600">
          Use this page for earpiece audio, YouTube captions, or both. The
          caption-only operator remains at{" "}
          <span className="font-mono text-xs">/operator-caption</span>.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
          <Link
            href="/operator-live"
            className="font-semibold text-indigo-700 underline break-all"
          >
            /operator-live
          </Link>
          <p className="text-sm font-semibold text-slate-800">
            Live output operator (this page)
          </p>
          <p className="text-sm text-slate-600">
            Choose Audio, Captions, or Both. You are already on this page during
            the service.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
          <Link
            href="/operator-caption"
            className="font-semibold text-indigo-700 underline break-all"
          >
            /operator-caption
          </Link>
          <p className="text-sm font-semibold text-slate-800">
            Caption operator (YouTube + transcripts)
          </p>
          <p className="text-sm text-slate-600">
            Caption-only console with Sermon mode transcript files. Use this when
            you only need YouTube captions.
          </p>
        </div>

        {showCaptionPages ? (
          <>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <Link
                href="/caption-settings"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-indigo-700 underline break-all"
              >
                /caption-settings
              </Link>
              <p className="text-sm font-semibold text-slate-800">
                Caption appearance
              </p>
              <p className="text-sm text-slate-600">
                Font size, position, and alignment for the OBS overlay. Set up
                before the service starts.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <Link
                href="/overlay"
                className="font-semibold text-indigo-700 underline break-all"
              >
                /overlay
              </Link>
              <p className="text-sm font-semibold text-slate-800">OBS overlay</p>
              <p className="text-sm text-slate-600">
                Browser Source for YouTube stream captions. Earpiece listeners do
                not use this page.
              </p>
              <p className="break-all font-mono text-xs text-slate-500">
                {baseUrl}/overlay
              </p>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
