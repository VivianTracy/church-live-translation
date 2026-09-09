"use client";

import { LiveUrlQrCode } from "@/components/LiveUrlQrCode";
import { getTranslationListenUrl } from "@/lib/audienceUrl";
import { useEffect, useState } from "react";

type AudienceUrlResponse = {
  listenUrl: string;
  source: "env" | "request-host" | "local-dev" | "local-dev-relay" | "localhost";
};

export function TranslationAudienceCard() {
  const [listenUrl, setListenUrl] = useState("");
  const [urlSource, setUrlSource] = useState<AudienceUrlResponse["source"] | null>(
    null
  );
  const [urlReachable, setUrlReachable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/audience-url")
      .then((response) => response.json() as Promise<AudienceUrlResponse>)
      .then((data) => {
        if (cancelled) {
          return;
        }

        setListenUrl(data.listenUrl);
        setUrlSource(data.source);
      })
      .catch(() => {
        if (!cancelled && typeof window !== "undefined") {
          setListenUrl(getTranslationListenUrl(window.location.origin));
          setUrlSource("localhost");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!listenUrl.startsWith("http")) {
      return;
    }

    let cancelled = false;

    void fetch(listenUrl, { method: "GET", cache: "no-store" })
      .then((response) => {
        if (!cancelled) {
          setUrlReachable(response.ok);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUrlReachable(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [listenUrl]);

  const showDeployWarning = urlReachable === false;
  const showLocalDevNote = urlSource === "local-dev";
  const showLocalRelayNote = urlSource === "local-dev-relay";

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 text-center space-y-5">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Phone listeners</h2>
        <p className="mt-1 text-sm text-slate-600">
          This QR code stays the same. People scan it to hear the translation on
          their phone.
        </p>
      </div>

      {listenUrl ? (
        <a
          href={listenUrl}
          className="block rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-emerald-800 break-all ring-1 ring-slate-200"
          target="_blank"
          rel="noreferrer"
        >
          {listenUrl}
        </a>
      ) : (
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500 ring-1 ring-slate-200">
          Loading listener link…
        </div>
      )}

      {listenUrl ? <LiveUrlQrCode url={listenUrl} /> : null}

      {showDeployWarning ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
          This link returned 404. Deploy the latest code, then scan again.
          Production is missing <span className="font-mono">/listen</span>.
        </p>
      ) : null}

      {showLocalRelayNote ? (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
          This QR points to the deployed listener. Phones can use mobile data
          while this computer handles headset audio.
        </p>
      ) : null}

      {showLocalDevNote ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
          Local listener link shown. For a permanent phone QR, set{" "}
          <span className="font-mono">NEXT_PUBLIC_AUDIENCE_URL</span> to{" "}
          <span className="font-mono">https://church-caption.vercel.app</span>{" "}
          in <span className="font-mono">.env.local</span> and restart.
        </p>
      ) : null}

      {!showLocalDevNote && !showLocalRelayNote && !showDeployWarning ? (
        <p className="text-sm text-slate-500">
          Phones can use mobile data. They do not need the same Wi‑Fi as this
          computer.
        </p>
      ) : null}
    </section>
  );
}
