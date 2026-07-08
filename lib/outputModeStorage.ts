export type OutputMode = "audio" | "captions" | "both";

export const OUTPUT_MODE_STORAGE_KEY = "church-caption-output-mode";

export function loadStoredOutputMode(): OutputMode {
  if (typeof window === "undefined") {
    return "both";
  }

  const stored = window.localStorage.getItem(OUTPUT_MODE_STORAGE_KEY);

  if (stored === "audio" || stored === "captions" || stored === "both") {
    return stored;
  }

  return "both";
}

export function saveStoredOutputMode(mode: OutputMode): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(OUTPUT_MODE_STORAGE_KEY, mode);
}

export function outputModeIncludesAudio(mode: OutputMode): boolean {
  return mode === "audio" || mode === "both";
}

export function outputModeIncludesCaptions(mode: OutputMode): boolean {
  return mode === "captions" || mode === "both";
}
