"use client";

import { getAudienceLiveUrl } from "@/lib/audienceUrl";
import { useEffect, useState } from "react";

type HealthStatus = {
  geminiConfigured: boolean;
  redisConfigured: boolean;
};

export function OperatorWorkflowNote() {
  const [audienceLiveUrl, setAudienceLiveUrl] = useState("/live");
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isLocalhost, setIsLocalhost] = useState(true);

  useEffect(() => {
    setAudienceLiveUrl(getAudienceLiveUrl(window.location.origin));
    setIsLocalhost(
      window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
    );

    fetch("/api/health")
      .then((response) => response.json())
      .then((data: HealthStatus) => setHealth(data))
      .catch(() => setHealth(null));
  }, []);

  if (isLocalhost) {
    return (
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-950 space-y-2">
        <p className="font-semibold">Sunday workflow</p>
        <p>
          Run the operator on this church computer. Audience phones should open
          the cloud link below, not localhost.
        </p>
        <p>
          Audience link:{" "}
          <a
            href={audienceLiveUrl}
            className="font-semibold underline break-all"
            target="_blank"
            rel="noreferrer"
          >
            {audienceLiveUrl}
          </a>
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950 space-y-2">
      <p className="font-semibold">Use the church computer for the operator</p>
      <p>
        The operator console needs a local microphone and Chrome speech
        recognition. During worship, run{" "}
        <span className="font-semibold">localhost/operator</span> on the
        streaming computer instead of this cloud page.
      </p>
      <p>
        Audience still watches{" "}
        <a
          href={audienceLiveUrl}
          className="font-semibold underline break-all"
          target="_blank"
          rel="noreferrer"
        >
          {audienceLiveUrl}
        </a>
        . Captions sync through shared Redis.
      </p>
      {health && !health.geminiConfigured && (
        <p className="font-semibold text-red-700">
          Translation is not configured on Vercel (GEMINI_API_KEY missing).
          That is fine if you only operate from localhost.
        </p>
      )}
    </section>
  );
}
