"use client";

import { LiveUrlQrCode } from "@/components/LiveUrlQrCode";
import { getAudienceLiveUrl } from "@/lib/audienceUrl";
import { useEffect, useState } from "react";

export function AudienceCard() {
  const [audienceLiveUrl, setAudienceLiveUrl] = useState("/live");

  useEffect(() => {
    setAudienceLiveUrl(getAudienceLiveUrl(window.location.origin));
  }, []);

  return (
    <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-center space-y-5">
      <h2 className="text-2xl font-bold">Audience</h2>

      <p className="text-lg text-slate-600">
        Share this link with the congregation:
      </p>

      <a
        href={audienceLiveUrl}
        className="block rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-blue-700 break-all ring-1 ring-slate-200"
        target="_blank"
        rel="noreferrer"
      >
        {audienceLiveUrl}
      </a>

      <LiveUrlQrCode url={audienceLiveUrl} />

      <p className="text-sm text-slate-500">
        Scan to open the live caption page on a phone.
      </p>
    </section>
  );
}
