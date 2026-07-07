"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function AudioOperatorRelatedPagesCard() {
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
          Use this page for earpiece translation. Captions for YouTube stay on
          the caption operator.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
          <Link
            href="/operator-openai"
            className="font-semibold text-indigo-700 underline break-all"
          >
            /operator-openai
          </Link>
          <p className="text-sm font-semibold text-slate-800">
            Caption operator (YouTube)
          </p>
          <p className="text-sm text-slate-600">
            Run English captions on the YouTube stream via OBS. This is separate
            from earpiece audio on the translation channel.
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
            Browser Source for YouTube stream captions. Earpiece listeners do not
            use this page.
          </p>
          <p className="break-all font-mono text-xs text-slate-500">
            {baseUrl}/overlay
          </p>
        </div>
      </div>
    </section>
  );
}
