"use client";

import {
  AUDIO_TRANSLATION_DIRECTION_LABELS,
  formatAudioTranslationDirectionLabel,
  loadStoredAudioTranslationDirection,
  saveStoredAudioTranslationDirection,
  type AudioTranslationDirection,
  type ResolvedAudioTranslationDirection,
} from "@/lib/audioTranslationDirection";
import { useEffect } from "react";

type TranslationDirectionCardProps = {
  selectedDirection: AudioTranslationDirection;
  resolvedDirection?: ResolvedAudioTranslationDirection | null;
  isDetecting?: boolean;
  disabled?: boolean;
  onDirectionChange: (direction: AudioTranslationDirection) => void;
};

export function TranslationDirectionCard({
  selectedDirection,
  resolvedDirection = null,
  isDetecting = false,
  disabled = false,
  onDirectionChange,
}: TranslationDirectionCardProps) {
  useEffect(() => {
    const storedDirection = loadStoredAudioTranslationDirection();

    if (storedDirection !== selectedDirection) {
      onDirectionChange(storedDirection);
    }
    // Load stored preference once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (direction: AudioTranslationDirection) => {
    saveStoredAudioTranslationDirection(direction);
    onDirectionChange(direction);
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          1. Translation direction
        </h2>
        <p className="text-sm text-slate-600">
          Auto listens for Chinese or English, then translates the other way.
          Headset audio waits until the language is clear. Choose a fixed
          direction if you already know.
        </p>
      </div>

      <select
        value={selectedDirection}
        disabled={disabled}
        onChange={(event) =>
          handleChange(event.target.value as AudioTranslationDirection)
        }
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="auto">Auto (detect Chinese or English)</option>
        <option value="zh-to-en">Chinese in → English out</option>
        <option value="en-to-zh">English in → Chinese out</option>
      </select>

      <p className="text-xs text-slate-500">
        Selected:{" "}
        {formatAudioTranslationDirectionLabel(
          selectedDirection,
          selectedDirection === "auto" ? resolvedDirection : null,
          isDetecting
        )}
      </p>

      {selectedDirection === "auto" ? (
        <p className="text-xs text-slate-500">
          Auto locks after the first clear speech so a Bible verse or Amen does
          not flip the headsets. An English sermon becomes Chinese audio; a
          Chinese sermon becomes English audio.{" "}
          {AUDIO_TRANSLATION_DIRECTION_LABELS["zh-to-en"]} and{" "}
          {AUDIO_TRANSLATION_DIRECTION_LABELS["en-to-zh"]} stay available as a
          manual override.
        </p>
      ) : null}
    </div>
  );
}
