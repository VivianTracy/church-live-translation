import { CaptionState } from "@/types/caption";

const STORAGE_KEY = "church-caption-state";

export function saveCaptionState(state: CaptionState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event("church-caption-updated"));
}

export function loadCaptionState(): CaptionState | null {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) return null;

  return JSON.parse(raw);
}