"use client";

import {
  loadOverlaySettings,
  saveOverlaySettings,
} from "@/lib/overlaySettingsApi";
import {
  DEFAULT_OVERLAY_SETTINGS,
  OVERLAY_FONT_PRESETS,
  overlaySettingsFromPreset,
  type OverlayAlign,
  type OverlayFontPreset,
  type OverlayPosition,
  type OverlaySettings,
} from "@/types/overlaySettings";
import { useEffect, useState } from "react";

type OverlaySettingsCardProps = {
  overlayPath?: string;
};

const POSITION_OPTIONS: { value: OverlayPosition; label: string }[] = [
  { value: "bottom", label: "Bottom" },
  { value: "lower-third", label: "Lower third" },
  { value: "top", label: "Top" },
];

const ALIGN_OPTIONS: { value: OverlayAlign; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

export function OverlaySettingsCard({
  overlayPath = "/overlay",
}: OverlaySettingsCardProps) {
  const [overlayUrl, setOverlayUrl] = useState(overlayPath);
  const [settings, setSettings] = useState<OverlaySettings>(
    DEFAULT_OVERLAY_SETTINGS
  );
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setOverlayUrl(`${window.location.origin}${overlayPath}`);
  }, [overlayPath]);

  useEffect(() => {
    loadOverlaySettings()
      .then(setSettings)
      .catch((error) => {
        console.error("Failed to load overlay settings:", error);
      });
  }, []);

  const persistSettings = async (next: OverlaySettings) => {
    setSettings(next);
    setIsSaving(true);
    setSaveError("");

    try {
      await saveOverlaySettings(next);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleFontPreset = (fontPreset: OverlayFontPreset) => {
    void persistSettings(
      overlaySettingsFromPreset(fontPreset, {
        position: settings.position,
        align: settings.align,
      })
    );
  };

  const handlePosition = (position: OverlayPosition) => {
    void persistSettings({ ...settings, position, updatedAt: Date.now() });
  };

  const handleAlign = (align: OverlayAlign) => {
    void persistSettings({ ...settings, align, updatedAt: Date.now() });
  };

  return (
    <section className="rounded-3xl border border-indigo-200 bg-indigo-50 p-6 text-sm text-indigo-950 space-y-5">
      <div className="space-y-1">
        <p className="font-semibold">Overlay appearance</p>
        <p className="text-indigo-900">
          Adjust how captions look on{" "}
          <span className="font-semibold">/overlay</span> and in OBS. Set this up
          before the service starts.
        </p>
        <p className="break-all rounded-2xl bg-white/80 p-3 font-mono text-xs">
          {overlayUrl}
        </p>
      </div>

      <div className="space-y-2">
        <p className="font-semibold">Font size</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(OVERLAY_FONT_PRESETS) as OverlayFontPreset[]).map(
            (preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleFontPreset(preset)}
                className={`rounded-2xl px-4 py-3 font-semibold transition ${
                  settings.fontPreset === preset
                    ? "bg-indigo-700 text-white"
                    : "bg-white/80 text-indigo-950 hover:bg-white"
                }`}
              >
                {OVERLAY_FONT_PRESETS[preset].label} (
                {OVERLAY_FONT_PRESETS[preset].maxLines}{" "}
                {OVERLAY_FONT_PRESETS[preset].maxLines === 1
                  ? "sentence"
                  : "sentences"}
                )
              </button>
            )
          )}
        </div>
      </div>

      <div className="space-y-2">
        <p className="font-semibold">Caption box position</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {POSITION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handlePosition(option.value)}
              className={`rounded-2xl px-4 py-3 font-semibold transition ${
                settings.position === option.value
                  ? "bg-indigo-700 text-white"
                  : "bg-white/80 text-indigo-950 hover:bg-white"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="font-semibold">Text alignment</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {ALIGN_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleAlign(option.value)}
              className={`rounded-2xl px-4 py-3 font-semibold transition ${
                settings.align === option.value
                  ? "bg-indigo-700 text-white"
                  : "bg-white/80 text-indigo-950 hover:bg-white"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="font-semibold">Preview</p>
        <div className="overflow-hidden rounded-2xl border border-indigo-200 bg-[#1a1a1a] shadow-inner">
          <iframe
            title="OBS overlay preview"
            src={overlayPath}
            className="aspect-video w-full border-0"
          />
        </div>
        <p className="text-xs text-indigo-900">
          {isSaving
            ? "Saving..."
            : "Changes apply within about one second."}
        </p>
      </div>

      {saveError ? (
        <p className="rounded-2xl bg-red-100 p-3 text-xs font-semibold text-red-800">
          {saveError}
        </p>
      ) : null}
    </section>
  );
}
