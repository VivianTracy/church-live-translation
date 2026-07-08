"use client";

import Link from "next/link";
import { CaptionSettingsLinkCard } from "@/components/CaptionSettingsLinkCard";
import { Header } from "@/components/Header";
import { OverlaySettingsCard } from "@/components/OverlaySettingsCard";

export default function CaptionSettingsPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-8">
        <Header />

        <section className="rounded-3xl border border-indigo-200 bg-indigo-50 p-6 text-sm text-indigo-950 space-y-3">
          <p className="text-sm font-bold tracking-widest text-indigo-800">
            CAPTION SETTINGS
          </p>
          <p className="text-base font-semibold">
            Adjust how English captions look on the YouTube stream.
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-indigo-900">
            <li>Set font size, caption box position, and text alignment.</li>
            <li>Confirm the preview matches what you want in OBS.</li>
            <li>Return to your operator page before the service starts.</li>
          </ol>
          <p className="text-xs text-indigo-800">
            OBS Browser Source URL:{" "}
            <span className="font-mono">/overlay</span>
          </p>
        </section>

        <OverlaySettingsCard />

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
          <p className="text-sm font-bold tracking-widest text-slate-500">
            RETURN TO OPERATOR
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/operator-live"
              className="rounded-2xl bg-violet-700 px-5 py-4 text-center text-lg font-bold text-white hover:bg-violet-800"
            >
              /operator-live
            </Link>
            <Link
              href="/operator-caption"
              className="rounded-2xl bg-sky-700 px-5 py-4 text-center text-lg font-bold text-white hover:bg-sky-800"
            >
              /operator-caption
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
