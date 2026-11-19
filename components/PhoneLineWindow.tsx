"use client";

import { LiveUrlQrCode } from "@/components/LiveUrlQrCode";
import { getPhoneTranslationListenUrl } from "@/lib/audienceUrl";
import { LOCAL_LISTEN_CHURCH_SLUG } from "@/lib/churchSlug";
import {
  loadStoredAudioInputSource,
  loadStoredInputDeviceId,
} from "@/lib/audioInputSource";
import {
  parseOperatorLoginReason,
  type OperatorLoginReason,
} from "@/lib/operatorLogin";
import { readPhoneLineOperatorContext } from "@/lib/phoneLineOperatorContext";
import {
  expireOperatorSession,
  useOperatorSessionGuard,
} from "@/lib/useOperatorSessionGuard";
import { usePhoneTranslationLine } from "@/lib/usePhoneTranslationLine";
import {
  HEADSET_LANGUAGES,
  TRANSLATION_LANGUAGE_LABELS,
  type HeadsetLanguageCode,
} from "@/lib/translationLanguages";
import {
  defaultPhoneLineLanguage,
  isPhoneLineId,
} from "@/lib/translationPhoneLine";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type OperatorAccount = {
  mode: "local" | "church";
  churchName: string | null;
  churchSlug: string;
  idleDeadlineAt?: string | null;
};

export function PhoneLineWindow() {
  const searchParams = useSearchParams();
  const lineId = searchParams.get("line") ?? "";
  const lineReady = isPhoneLineId(lineId);
  const [account, setAccount] = useState<OperatorAccount | null>(null);
  const [accountError, setAccountError] = useState("");
  const [idleDeadlineAt, setIdleDeadlineAt] = useState<string | null>(null);
  const [language, setLanguage] = useState<HeadsetLanguageCode>("en");
  const [headsetLanguage, setHeadsetLanguage] =
    useState<HeadsetLanguageCode | null>(null);
  const [primaryLive, setPrimaryLive] = useState(false);
  const [listenUrl, setListenUrl] = useState("");
  const churchSlug = account?.churchSlug;

  const { status, error, chunksUploaded, startPhoneLine, stopPhoneLine } =
    usePhoneTranslationLine({
      churchSlug,
      deviceId: "",
      primaryLive,
      lineId,
    });
  const running = status === "connecting" || status === "live";

  const handleUnauthorized = useCallback(
    (reason?: OperatorLoginReason) => {
      stopPhoneLine();
      expireOperatorSession(reason);
    },
    [stopPhoneLine]
  );

  useOperatorSessionGuard({
    enabled: account?.mode === "church",
    isTranslationActive: running,
    idleDeadlineAt,
    onUnauthorized: handleUnauthorized,
  });

  useEffect(() => {
    const languageLabel = TRANSLATION_LANGUAGE_LABELS[language];
    document.title = lineReady
      ? `${languageLabel} phone translation`
      : "Phone translation";
  }, [language, lineReady]);

  useEffect(() => {
    void fetch("/api/operator/me", { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as OperatorAccount & {
          error?: string;
          reason?: string;
        };

        if (response.status === 401) {
          expireOperatorSession(parseOperatorLoginReason(body.reason));
          return;
        }

        if (!response.ok) {
          setAccountError(body.error ?? "Could not confirm church sign-in.");
          return;
        }

        setAccount({
          mode: body.mode,
          churchName: body.churchName,
          churchSlug: body.churchSlug || LOCAL_LISTEN_CHURCH_SLUG,
          idleDeadlineAt: body.idleDeadlineAt ?? null,
        });
        setIdleDeadlineAt(body.idleDeadlineAt ?? null);
        setAccountError("");
      })
      .catch(() => {
        setAccountError("Could not confirm church sign-in.");
      });
  }, []);

  useEffect(() => {
    const headset = readPhoneLineOperatorContext().headsetLanguage;
    setHeadsetLanguage(headset);
    setLanguage(headset ? defaultPhoneLineLanguage(headset) : "en");
  }, []);

  useEffect(() => {
    const readContext = () => {
      const context = readPhoneLineOperatorContext();
      setPrimaryLive(context.primaryLive);
      setHeadsetLanguage(context.headsetLanguage);
    };

    readContext();
    window.addEventListener("storage", readContext);
    const timer = window.setInterval(readContext, 1000);

    return () => {
      window.removeEventListener("storage", readContext);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!lineReady) {
      return;
    }

    const slug = churchSlug || LOCAL_LISTEN_CHURCH_SLUG;

    void fetch("/api/audience-url")
      .then((response) => response.json() as Promise<{ listenUrl?: string }>)
      .then((data) => {
        if (data.listenUrl) {
          setListenUrl(
            `${data.listenUrl.replace(/\/$/, "")}/phone/${lineId}`
          );
          return;
        }

        setListenUrl(getPhoneTranslationListenUrl(window.location.origin, slug, lineId));
      })
      .catch(() => {
        setListenUrl(getPhoneTranslationListenUrl(window.location.origin, slug, lineId));
      });
  }, [churchSlug, lineId, lineReady]);

  if (!lineReady) {
    return (
      <section className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">Phone language</h1>
        <p className="mt-3 text-sm text-slate-600">
          This window has no language id. Go back to the main page and click
          Open another language.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          Phone language
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          {account?.churchName || "Church Translation"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Choose the language, then share this QR code. People tap Listen and
          use headphones. Closing this window stops this language.
        </p>
        {headsetLanguage ? (
          <p className="mt-2 text-sm text-slate-600">
            Headsets are playing {TRANSLATION_LANGUAGE_LABELS[headsetLanguage]}.
          </p>
        ) : null}
      </div>

      <label htmlFor="phone-line-language" className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Output language</span>
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
          {HEADSET_LANGUAGES.map((code) => (
            <option key={code} value={code}>
              {TRANSLATION_LANGUAGE_LABELS[code]}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        disabled={status === "connecting" || (!running && !primaryLive)}
        onClick={() => {
          if (running) {
            stopPhoneLine();
            return;
          }

          void startPhoneLine(
            language,
            loadStoredInputDeviceId(loadStoredAudioInputSource())
          );
        }}
        className={`w-full rounded-2xl px-5 py-4 text-lg font-bold ${
          status === "connecting" || (!running && !primaryLive)
            ? "cursor-not-allowed bg-slate-200 text-slate-500"
            : running
              ? "bg-white text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50"
              : "bg-emerald-600 text-white hover:bg-emerald-700"
        }`}
      >
        {status === "connecting"
          ? "Starting…"
          : status === "live"
            ? "Stop this language"
            : "Start this language"}
      </button>

      {!primaryLive ? (
        <p className="text-sm text-slate-500">
          Start the main translation first. You can still share the QR code.
        </p>
      ) : null}

      {status === "live" ? (
        <p className="text-sm text-emerald-800">
          {TRANSLATION_LANGUAGE_LABELS[language]} is live for phones.
          {chunksUploaded > 0 ? ` ${chunksUploaded} audio chunks sent.` : ""}
        </p>
      ) : null}

      {accountError ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
          {accountError}
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
            code.
          </p>
          <LiveUrlQrCode url={listenUrl} />
          <p className="break-all font-mono text-xs text-slate-500">{listenUrl}</p>
        </div>
      ) : null}
    </section>
  );
}
