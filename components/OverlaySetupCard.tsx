"use client";

import { useEffect, useState } from "react";

type OverlaySetupCardProps = {
  overlayPath?: string;
};

export function OverlaySetupCard({
  overlayPath = "/overlay",
}: OverlaySetupCardProps) {
  const [overlayUrl, setOverlayUrl] = useState(overlayPath);

  useEffect(() => {
    setOverlayUrl(`${window.location.origin}${overlayPath}`);
  }, [overlayPath]);

  return (
    <section className="rounded-3xl border border-indigo-200 bg-indigo-50 p-6 text-sm text-indigo-950 space-y-3">
      <p className="font-semibold">OBS overlay setup</p>
      <p>
        Add an OBS Browser Source at <span className="font-semibold">1920×1080</span>{" "}
        pointing to:
      </p>
      <p className="break-all rounded-2xl bg-white/80 p-3 font-mono text-xs">
        {overlayUrl}
      </p>
      <p>
        YouTube viewers see captions when this source is visible in the OBS
        Program scene. Keep Church Caption running locally on the streaming
        computer during the service.
      </p>
    </section>
  );
}
