export const AUDIO_OUTPUT_VOLUME_STORAGE_KEY =
  "church-caption-audio-output-volume";

export const DEFAULT_AUDIO_OUTPUT_VOLUME = 1;

export function clampAudioOutputVolume(volume: number): number {
  if (!Number.isFinite(volume)) {
    return DEFAULT_AUDIO_OUTPUT_VOLUME;
  }

  return Math.min(1, Math.max(0, volume));
}

export function loadStoredAudioOutputVolume(): number {
  if (typeof window === "undefined") {
    return DEFAULT_AUDIO_OUTPUT_VOLUME;
  }

  const stored = window.localStorage.getItem(AUDIO_OUTPUT_VOLUME_STORAGE_KEY);

  if (stored === null) {
    return DEFAULT_AUDIO_OUTPUT_VOLUME;
  }

  return clampAudioOutputVolume(Number(stored));
}

export function saveStoredAudioOutputVolume(volume: number): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    AUDIO_OUTPUT_VOLUME_STORAGE_KEY,
    String(clampAudioOutputVolume(volume))
  );
}
