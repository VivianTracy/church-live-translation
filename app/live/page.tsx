"use client";

import { useEffect, useState } from "react";

type CaptionState = {
  isLive: boolean;
  caption: string;
  updatedAt: number;
};

export default function LivePage() {
  const [captionState, setCaptionState] = useState<CaptionState>({
    isLive: false,
    caption: "",
    updatedAt: 0,
  });

  useEffect(() => {
    const loadState = () => {
      const saved = localStorage.getItem("church-caption-state");
      if (!saved) return;

      setCaptionState(JSON.parse(saved));
    };

    loadState();

    window.addEventListener("storage", loadState);
    window.addEventListener("church-caption-updated", loadState);

    return () => {
      window.removeEventListener("storage", loadState);
      window.removeEventListener("church-caption-updated", loadState);
    };
  }, []);

  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-5xl font-bold text-slate-900">Church Caption</h1>

        <p className="mt-3 text-xl text-slate-600">Live English Captions</p>

        <p className="mt-1 text-slate-500">Sunday Worship</p>

        <div className="mt-12 rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-10">
          <div className="text-6xl mb-6">{captionState.isLive ? "🟢" : "💬"}</div>

          <h2 className="text-3xl font-semibold">
            {captionState.isLive
              ? "Live captions are on"
              : "Waiting for today's sermon..."}
          </h2>

          <p className="mt-4 text-slate-600">
            Please keep this page open during the worship service.
          </p>
        </div>

        <div className="mt-10 rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-8">
          <h3 className="text-lg font-semibold text-slate-700 mb-6">
            Live Caption
          </h3>

          <p className="text-2xl leading-relaxed text-slate-800">
            {captionState.caption ||
              "Today's English captions will appear here."}
          </p>
        </div>

        <p className="mt-10 text-sm text-slate-400">
          Peace Valley Chinese Christian Church
        </p>
      </div>
    </main>
  );
}