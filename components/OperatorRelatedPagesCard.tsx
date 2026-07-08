"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function OperatorRelatedPagesCard() {
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
          You stay on this page during the service. Use these links for OBS setup
          or practice.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
          <Link
            href="/caption-settings"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-indigo-700 underline break-all"
          >
            /caption-settings
          </Link>
          <p className="text-sm font-semibold text-slate-800">Caption appearance</p>
          <p className="text-sm text-slate-600">
            Font size, position, and alignment for the OBS overlay.
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
            Add this URL as an OBS Browser Source at 1920×1080. YouTube viewers
            see English captions on the stream. OBS loads this page — you do not
            need to open it in Chrome during the service.
          </p>
          <p className="break-all font-mono text-xs text-slate-500">
            {baseUrl}/overlay
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
          <Link
            href="/operator-live"
            className="font-semibold text-indigo-700 underline break-all"
          >
            /operator-live
          </Link>
          <p className="text-sm font-semibold text-slate-800">
            Live output operator
          </p>
          <p className="text-sm text-slate-600">
            Run earpiece audio translation, YouTube captions, or both from one
            console during worship.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
          <Link
            href="/operator-caption?test=1"
            className="font-semibold text-indigo-700 underline break-all"
          >
            /operator-caption?test=1
          </Link>
          <p className="text-sm font-semibold text-slate-800">AV replay test</p>
          <p className="text-sm text-slate-600">
            Practice before Sunday with the recorded sermon clip routed through
            OBS and BlackHole (Mac) or VB-Cable (Windows). Same operator controls
            as this page, plus step-by-step audio routing help.
          </p>
        </div>
      </div>
    </section>
  );
}
