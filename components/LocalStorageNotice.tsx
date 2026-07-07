"use client";

import { useEffect, useState } from "react";

export function LocalStorageNotice() {
  const [isLocal, setIsLocal] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/storage-mode")
      .then((response) => response.json())
      .then((body: { local?: boolean }) => {
        setIsLocal(Boolean(body.local));
      })
      .catch(() => {
        setIsLocal(false);
      });
  }, []);

  if (!isLocal) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-violet-200 bg-violet-50 p-4 text-xs text-violet-950">
      <p className="font-semibold">Local caption storage</p>
      <p className="mt-1">
        Redis is not configured, so captions and overlay settings stay on this
        computer. OBS overlay works without Redis keys.
      </p>
    </section>
  );
}
