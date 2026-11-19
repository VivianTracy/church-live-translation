"use client";

import {
  clearPhoneLineOperatorLive,
  writePhoneLineOperatorContext,
} from "@/lib/phoneLineOperatorContext";
import {
  createPhoneLineId,
  getPhoneLineOperatorPath,
} from "@/lib/translationPhoneLine";
import type { HeadsetLanguageCode } from "@/lib/translationLanguages";
import { useEffect, useState } from "react";

type PhoneSecondLanguageCardProps = {
  primaryLive: boolean;
  headsetLanguage: HeadsetLanguageCode;
};

export function PhoneSecondLanguageCard({
  primaryLive,
  headsetLanguage,
}: PhoneSecondLanguageCardProps) {
  const [popupError, setPopupError] = useState("");

  useEffect(() => {
    writePhoneLineOperatorContext({ primaryLive, headsetLanguage });
  }, [headsetLanguage, primaryLive]);

  useEffect(() => {
    const markStopped = () => clearPhoneLineOperatorLive();
    window.addEventListener("pagehide", markStopped);
    return () => window.removeEventListener("pagehide", markStopped);
  }, []);

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Another language for phones
        </h2>
        <p className="text-sm text-slate-600">
          Opens a window where you choose one language and share its QR code.
          Click again for another language. Headsets stay on the first
          language. Each window stops when the main translation stops.
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          const lineId = createPhoneLineId();
          const popup = window.open(
            getPhoneLineOperatorPath(lineId),
            `church-phone-${lineId}`,
            "popup,width=460,height=900"
          );

          if (!popup) {
            setPopupError(
              "The browser blocked the new window. Allow pop-ups for this site, then click again."
            );
            return;
          }

          setPopupError("");
          popup.focus();
        }}
        className="w-full rounded-2xl bg-emerald-600 px-5 py-4 text-lg font-bold text-white hover:bg-emerald-700"
      >
        Open another language
      </button>

      {popupError ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
          {popupError}
        </p>
      ) : null}
    </section>
  );
}
