"use client";

import { useEffect, useState } from "react";

export default function OperatorPage() {
  const [isLive, setIsLive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleToggleLive = () => {
    const nextIsLive = !isLive;
    setIsLive(nextIsLive);

    localStorage.setItem(
      "church-caption-state",
      JSON.stringify({
        isLive: nextIsLive,
        caption: nextIsLive ? "Live captions have started." : "",
        updatedAt: Date.now(),
      })
    );

    window.dispatchEvent(new Event("church-caption-updated"));
  };

  const [testCaption, setTestCaption] = useState(
  "Welcome to today's worship service."
);

  useEffect(() => {
    if (!isLive) {
      setSeconds(0);
      return;
    }

    const timer = setInterval(() => {
      setSeconds((value) => value + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isLive]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    return [hours, minutes, secs]
      .map((value) => value.toString().padStart(2, "0"))
      .join(":");
  };

  const handleSendTestCaption = () => {
  localStorage.setItem(
    "church-caption-state",
    JSON.stringify({
      isLive: true,
      caption: testCaption,
      updatedAt: Date.now(),
    })
  );

  setIsLive(true);
  window.dispatchEvent(new Event("church-caption-updated"));
};

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="text-center space-y-3">
          <h1 className="text-5xl font-bold tracking-tight">Church Caption</h1>
          <p className="text-xl text-slate-600">Sunday Worship</p>
          <p className="text-base text-slate-500">
            Peace Valley Chinese Christian Church
          </p>
          <p className="text-2xl font-semibold text-slate-800">
            Chinese → English
          </p>
        </header>

        <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-center space-y-6">
          <p className="text-sm font-bold tracking-widest text-slate-500">
            STATUS
          </p>

          <div className="space-y-2">
            <p className="text-6xl font-bold">
              {isLive ? "🟢 LIVE" : "⚪ OFF"}
            </p>
            <p className="text-2xl text-slate-600">
              {isLive ? "Captions are Broadcasting" : "Ready to Start"}
            </p>
            <p className="text-4xl font-mono font-semibold text-slate-800">
              {formatTime(seconds)}
            </p>
          </div>

          <button
            onClick={handleToggleLive}
            className={`w-full rounded-2xl px-8 py-7 text-3xl font-bold text-white shadow-sm transition ${
              isLive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {isLive ? "🔴 Stop Live Caption" : "🟢 Start Live Caption"}
          </button>
        </section>
        
        <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 space-y-5">
          <h2 className="text-2xl font-bold text-center">Broadcast Test Caption</h2>

          <textarea
            value={testCaption}
            onChange={(event) => setTestCaption(event.target.value)}
            className="h-32 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-lg outline-none focus:ring-2 focus:ring-slate-300"
          />

          <button
            onClick={handleSendTestCaption}
            className="w-full rounded-2xl bg-slate-900 px-6 py-5 text-2xl font-bold text-white hover:bg-slate-800"
          >
            Send Test Caption
          </button>
        </section>

        <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-center space-y-5">
          <h2 className="text-2xl font-bold">Audience</h2>

          <p className="text-lg text-slate-600">
            Connected devices: <span className="font-bold">0</span>
          </p>

          <div className="mx-auto flex h-56 w-56 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200">
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 25 }).map((_, index) => (
                <div
                  key={index}
                  className={`h-8 w-8 rounded-sm ${
                    [0, 1, 2, 5, 7, 10, 12, 14, 17, 19, 20, 22, 23, 24].includes(
                      index
                    )
                      ? "bg-slate-900"
                      : "bg-slate-100"
                  }`}
                />
              ))}
            </div>
          </div>

          <p className="text-lg font-medium">
            Scan to receive live English captions.
          </p>

          <p className="text-sm text-slate-500">localhost:3000/live</p>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <button
            onClick={() => setShowAdvanced((value) => !value)}
            className="flex w-full items-center justify-between text-left text-lg font-semibold"
          >
            <span>Advanced Settings</span>
            <span>{showAdvanced ? "−" : "+"}</span>
          </button>

          {showAdvanced && (
            <div className="mt-5 space-y-3">
              <p className="text-sm text-slate-500">
                Glossary terms are set before worship. The operator usually does
                not need to change these during the service.
              </p>

              <textarea
                className="h-40 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                defaultValue={`恩典 = grace
称义 = justification
成圣 = sanctification
圣灵 = Holy Spirit
福音 = gospel
以弗所书 = Ephesians`}
              />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}