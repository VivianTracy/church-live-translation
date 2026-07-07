import type { CaptionState } from "@/types/caption";
import {
  DEFAULT_OVERLAY_SETTINGS,
  type OverlaySettings,
} from "@/types/overlaySettings";

let captionState: CaptionState | null = null;
let overlaySettings: OverlaySettings = DEFAULT_OVERLAY_SETTINGS;

export function getLocalCaptionState(): CaptionState | null {
  return captionState;
}

export function setLocalCaptionState(state: CaptionState): void {
  captionState = state;
}

export function getLocalOverlaySettings(): OverlaySettings {
  return overlaySettings;
}

export function setLocalOverlaySettings(settings: OverlaySettings): void {
  overlaySettings = settings;
}
