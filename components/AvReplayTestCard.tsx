"use client";

import {
  AV_REPLAY_MAC_STEPS,
  AV_REPLAY_TEST,
  AV_REPLAY_WINDOWS_STEPS,
} from "@/lib/avReplayTest";

export function AvReplayTestCard() {
  return (
    <section className="rounded-3xl border border-sky-200 bg-sky-50 p-8 text-sm text-sky-950 space-y-6">
      <div className="space-y-2 text-center">
        <p className="text-sm font-bold tracking-widest text-sky-700">
          AV REPLAY TEST MODE
        </p>
        <h2 className="text-2xl font-bold text-sky-950">
          Mimic OBS / X-USB input (Option 1)
        </h2>
        <p className="text-sky-900">
          Issue #{AV_REPLAY_TEST.issue}. Verify the clip, route it through a
          virtual audio device, then use the normal operator microphone flow.
          Church Caption still uses Chrome speech recognition on the selected
          input device.
        </p>
      </div>

      <div className="rounded-2xl bg-white/80 p-4 space-y-3">
        <p className="font-semibold">Test clip</p>
        <p>
          Source:{" "}
          <a
            href={AV_REPLAY_TEST.sourceUrl}
            className="underline break-all"
            target="_blank"
            rel="noreferrer"
          >
            {AV_REPLAY_TEST.sourceUrl}
          </a>
        </p>
        <p>Segment: {AV_REPLAY_TEST.segmentLabel}</p>
        <audio
          controls
          preload="metadata"
          className="w-full"
          src={AV_REPLAY_TEST.audioPath}
        >
          Your browser does not support audio playback.
        </audio>
        <p className="text-xs text-sky-800">
          Use this player to confirm you hear the expected sermon section. For
          the actual test, route the same file through OBS → BlackHole (Mac) or
          VB-Cable (Windows), not through laptop speakers.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-white/80 p-4 space-y-2">
          <p className="font-semibold">MacBook dev setup</p>
          <ol className="list-decimal list-inside space-y-2 text-sky-900">
            {AV_REPLAY_MAC_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        <div className="rounded-2xl bg-white/80 p-4 space-y-2">
          <p className="font-semibold">Church Windows PC setup</p>
          <ol className="list-decimal list-inside space-y-2 text-sky-900">
            {AV_REPLAY_WINDOWS_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </div>

      <div className="rounded-2xl border border-sky-200 bg-white/60 p-4 text-xs text-sky-900 space-y-1">
        <p className="font-semibold">Regenerate clip</p>
        <p>
          <code className="rounded bg-white px-1 py-0.5">
            npm run extract:av-replay-audio
          </code>
        </p>
        <p>
          Output: <code>{AV_REPLAY_TEST.fixturePath}</code> and{" "}
          <code>public{AV_REPLAY_TEST.audioPath}</code>
        </p>
      </div>
    </section>
  );
}
