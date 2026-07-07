"use client";

import { loadCaptionState } from "@/lib/captionApi";
import {
  getOverlayLayoutClasses,
  loadOverlaySettings,
} from "@/lib/overlaySettingsApi";
import { RollingCaptionDisplay } from "@/components/RollingCaptionDisplay";
import { CaptionState } from "@/types/caption";
import {
  DEFAULT_OVERLAY_SETTINGS,
  type OverlaySettings,
} from "@/types/overlaySettings";
import { useEffect, useState } from "react";

export default function OverlayPage() {
  const [captionState, setCaptionState] = useState<CaptionState>({
    isLive: false,
    caption: "",
    updatedAt: 0,
  });
  const [overlaySettings, setOverlaySettings] = useState<OverlaySettings>(
    DEFAULT_OVERLAY_SETTINGS
  );

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
        const [saved, settings] = await Promise.all([
          loadCaptionState(),
          loadOverlaySettings(),
        ]);

        if (saved) {
          setCaptionState({
            isLive: saved.isLive,
            caption: saved.isLive ? saved.caption : "",
            updatedAt: saved.updatedAt,
          });
        }

        setOverlaySettings(settings);
      } catch (error) {
        console.error("Failed to load overlay state:", error);
      }
    };

    void loadState();
    const timer = setInterval(loadState, 500);

    return () => clearInterval(timer);
  }, []);

  const showCaption = captionState.isLive && captionState.caption.trim();
  const layoutClasses = getOverlayLayoutClasses(
    overlaySettings.position,
    overlaySettings.align
  );

  return (
    <main
      className={`flex h-screen w-screen p-8 ${layoutClasses}`}
    >
      <div
        className={`inline-block w-full max-w-5xl rounded-2xl px-8 py-6 ${
          showCaption ? "bg-black/70" : "bg-transparent"
        }`}
      >
        {showCaption ? (
          <RollingCaptionDisplay
            caption={captionState.caption}
            updatedAt={captionState.updatedAt}
            placeholder=""
            minFontPx={overlaySettings.minFontPx}
            maxFontPx={overlaySettings.maxFontPx}
            lightText
            layout="rollingLines"
            maxLines={overlaySettings.maxLines}
            className="w-full"
            lineAlign={overlaySettings.align}
          />
        ) : null}
      </div>
    </main>
  );
}
