"use client";

import { loadCaptionState } from "@/lib/captionState";
import { CaptionState } from "@/types/caption";
import { useEffect, useState } from "react";

export default function LivePage() {
  const [captionState, setCaptionState] = useState<CaptionState>({
    isLive: false,
    caption: "",
    updatedAt: 0,
  });

  useEffect(() => {
    const loadState = () => {
      const saved = loadCaptionState();
      if (saved) setCaptionState(saved);
    };

    loadState();

    window.addEventListener("storage", loadState);
    window.addEventListener("church-caption-updated", loadState);

    return () => {
      window.removeEventListener("storage", loadState);
      window.removeEventListener("church-caption-updated", loadState);
    };
  }, []);

  const hasCaption = captionState.caption.trim().length > 0;

  return (
    <main className="min-h-screen bg-stone-50 px-5 py-8 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col">
        <header className="text-center">
          <p className="text-sm font-medium text-slate-500">
            Peace Valley Chinese Christian Church
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            English Live Captions
          </h1>
          <p className="mt-2 text-lg text-slate-600">Sunday Worship</p>
        </header>

        <section className="mt-10 rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-bold tracking-widest text-slate-500">
            {captionState.isLive ? "LIVE" : "WAITING"}
          </p>

          <div className="mt-4 text-5xl">
            {captionState.isLive ? "●" : "💬"}
          </div>

          <h2 className="mt-4 text-2xl font-semibold">
            {captionState.isLive
              ? "Live captions are on"
              : "Waiting for worship to begin..."}
          </h2>

          <p className="mt-3 text-slate-600">
            Please keep this page open during the worship service.
          </p>
        </section>

        <section className="mt-8 flex flex-1 items-center rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <p
            className={`w-full text-center leading-relaxed ${
              hasCaption
                ? "text-4xl font-semibold text-slate-900"
                : "text-2xl text-slate-400"
            }`}
          >
            {hasCaption
              ? captionState.caption
              : "Today’s English captions will appear here."}
          </p>
        </section>

        <footer className="mt-8 text-center text-xs text-slate-400">
          Church Caption · Please silence your phone during worship
        </footer>
      </div>
    </main>
  );
}