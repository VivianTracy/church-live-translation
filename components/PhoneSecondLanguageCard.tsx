"use client";

import { LiveUrlQrCode } from "@/components/LiveUrlQrCode";
import { getPhoneTranslationListenUrl } from "@/lib/audienceUrl";
import { usePhoneTranslationLine } from "@/lib/usePhoneTranslationLine";
import {
  HEADSET_LANGUAGES,
  TRANSLATION_LANGUAGE_LABELS,
  type HeadsetLanguageCode,
} from "@/lib/translationLanguages";
import { defaultPhoneLineLanguage } from "@/lib/translationPhoneLine";
import { useEffect, useState } from "react";

type PhoneSecondLanguageCardProps = {
  churchSlug?: string;
  deviceId: string;
  primaryLive: boolean;
  blockedLanguage: HeadsetLanguageCode;
};

export function PhoneSecondLanguageCard({
  churchSlug,
  deviceId,
  primaryLive,
  blockedLanguage,
}: PhoneSecondLanguageCardProps) {
  const [language, setLanguage] = useState<HeadsetLanguageCode>(
    defaultPhoneLineLanguage(blockedLanguage)
  );
  const [listenUrl, setListenUrl] = useState("");
  const { status, error, chunksUploaded, startPhoneLine, stopPhoneLine } =
    usePhoneTranslationLine({
      churchSlug,
      deviceId,
      primaryLive,
    });
  const running = status === "connecting" || status === "live";
  const sameLanguage = language === blockedLanguage;

  useEffect(() => {
    setLanguage((current) =>
      current === blockedLanguage
        ? defaultPhoneLineLanguage(blockedLanguage)
        : current
    );
  }, [blockedLanguage]);

  useEffect(() => {
    const slug = churchSlug || "local";

    void fetch("/api/audience-url")
      .then((response) => response.json() as Promise<{ listenUrl?: string }>)
      .then((data) => {
        if (data.listenUrl) {
          setListenUrl(`${data.listenUrl.replace(/\/$/, "")}/phone`);
          return;
        }

        setListenUrl(getPhoneTranslationListenUrl(window.location.origin, slug));
      })
      .catch(() => {
        setListenUrl(getPhoneTranslationListenUrl(window.location.origin, slug));
      });
  }, [churchSlug]);

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Second language for phones
        </h2>
        <p className="text-sm text-slate-600">
          Opens another translation session. Phones on this QR hear it. The
          transmitter and headsets stay on the first language. This stops when
          the main translation stops.
        </p>
      </div>

      <label htmlFor="phone-line-language" className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Phone language</span>
        <select
          id="phone-line-language"
          value={language}
          disabled={running}
          onChange={(event) => {
            const next = HEADSET_LANGUAGES.find(
              (code) => code === event.target.value
            );

            if (next) {
              setLanguage(next);
            }
          }}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {HEADSET_LANGUAGES.filter((code) => code !== blockedLanguage).map(
            (code) => (
            <option key={code} value={code}>
              {TRANSLATION_LANGUAGE_LABELS[code]}
            </option>
          )
        )}
        </select>
      </label>

      {sameLanguage ? (
        <p className="text-sm text-amber-800">
          Choose a phone language that is different from the headset language.
        </p>
      ) : null}

      <button
        type="button"
        disabled={
          status === "connecting" || (!running && (!primaryLive || sameLanguage))
        }
        onClick={() => {
          if (running) {
            stopPhoneLine();
            return;
          }

          void startPhoneLine(language);
        }}
        className={`w-full rounded-2xl px-5 py-4 text-lg font-bold ${
          status === "connecting" || (!running && (!primaryLive || sameLanguage))
            ? "cursor-not-allowed bg-slate-200 text-slate-500"
            : running
              ? "bg-white text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50"
              : "bg-emerald-600 text-white hover:bg-emerald-700"
        }`}
      >
        {status === "connecting"
          ? "Starting phone translation…"
          : status === "live"
            ? "Stop phone translation"
            : "Translate to a second language"}
      </button>

      {!primaryLive ? (
        <p className="text-xs text-slate-500">
          Start the main translation first.
        </p>
      ) : null}

      {status === "live" ? (
        <p className="text-sm text-emerald-800">
          Phone translation is live in {TRANSLATION_LANGUAGE_LABELS[language]}.
          {chunksUploaded > 0 ? ` ${chunksUploaded} audio chunks sent.` : ""}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
          {error}
        </p>
      ) : null}

      {listenUrl ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            People who want {TRANSLATION_LANGUAGE_LABELS[language]} scan this
            code and tap Listen. Use headphones.
          </p>
          <LiveUrlQrCode url={listenUrl} />
          <p className="break-all font-mono text-xs text-slate-500">{listenUrl}</p>
        </div>
      ) : null}
    </section>
  );
}
