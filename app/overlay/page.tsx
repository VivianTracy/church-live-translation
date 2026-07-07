"use client";

import { loadCaptionState } from "@/lib/captionApi";
import { RollingCaptionDisplay } from "@/components/RollingCaptionDisplay";
import { CaptionState } from "@/types/caption";
import { useEffect, useState } from "react";

export default function OverlayPage() {
  const [captionState, setCaptionState] = useState<CaptionState>({
    isLive: false,
    caption: "",
    updatedAt: 0,
  });

  useEffect(() => {
    document.documentElement.classList.add("overlay-page");
    document.body.classList.add("overlay-page");

    return () => {
      document.documentElement.classList.remove("overlay-page");
      document.body.classList.remove("overlay-page");
    };
  }, []);

  useEffect(() => {
    const loadState = async () => {
      try {
        const saved = await loadCaptionState();

        if (saved) {
          setCaptionState({
            isLive: saved.isLive,
            caption: saved.isLive ? saved.caption : "",
            updatedAt: saved.updatedAt,
          });
        }
      } catch (error) {
        console.error("Failed to load overlay caption state:", error);
      }
    };

    void loadState();
    const timer = setInterval(loadState, 500);

    return () => clearInterval(timer);
  }, []);

  const showCaption = captionState.isLive && captionState.caption.trim();

  return (
    <main className="flex h-screen w-screen items-end justify-center p-8">
      <div
        className={`w-full max-w-5xl rounded-2xl px-8 py-6 ${
          showCaption ? "bg-black/70" : "bg-transparent"
        }`}
      >
        {showCaption ? (
          <RollingCaptionDisplay
            caption={captionState.caption}
            updatedAt={captionState.updatedAt}
            placeholder=""
            minFontPx={28}
            maxFontPx={52}
            lightText
            layout="rollingLines"
            maxLines={3}
            className="w-full"
          />
        ) : null}
      </div>
    </main>
  );
}
