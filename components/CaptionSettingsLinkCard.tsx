"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function CaptionSettingsLinkCard() {
  const [baseUrl, setBaseUrl] = useState("http://localhost:3000");

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  return (
    <section className="rounded-3xl border border-indigo-200 bg-indigo-50 p-6 text-sm text-indigo-950 space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-bold tracking-widest text-indigo-800">
          CAPTION APPEARANCE
        </p>
        <p className="text-sm text-indigo-900">
          Font size, position, and alignment for the OBS overlay are on a
          separate page. Set this up before the service starts. Opens in a new
          window so you can keep the operator page running.
        </p>
      </div>

      <Link
        href="/caption-settings"
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center rounded-2xl bg-indigo-700 px-6 py-5 text-xl font-bold text-white hover:bg-indigo-800"
      >
        Open Caption Settings
      </Link>

      <p className="break-all font-mono text-xs text-indigo-800">
        {baseUrl}/caption-settings
      </p>
    </section>
  );
}
