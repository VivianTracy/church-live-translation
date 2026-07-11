"use client";

import {
  loadStoredAudioTranslationDirection,
  saveStoredAudioTranslationDirection,
  type AudioTranslationDirection,
} from "@/lib/audioTranslationDirection";
import { useEffect } from "react";

const DIRECTION_LABELS: Record<AudioTranslationDirection, string> = {
  "zh-to-en": "Chinese → English",
  "en-to-zh": "English → Chinese",
};

type TranslationDirectionCardProps = {
  selectedDirection: AudioTranslationDirection;
  disabled?: boolean;
  onDirectionChange: (direction: AudioTranslationDirection) => void;
};

export function TranslationDirectionCard({
  selectedDirection,
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
          What language goes in, and what listeners hear on the headsets.
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
        <option value="zh-to-en">Chinese in → English out</option>
        <option value="en-to-zh">English in → Chinese out</option>
      </select>

      <p className="text-xs text-slate-500">
        Selected: {DIRECTION_LABELS[selectedDirection]}
      </p>
    </div>
  );
}
