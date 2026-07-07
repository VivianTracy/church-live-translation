import {
  DEFAULT_OVERLAY_SETTINGS,
  type OverlaySettings,
} from "@/types/overlaySettings";

export async function loadOverlaySettings(): Promise<OverlaySettings> {
  const response = await fetch("/api/overlay-settings");

  if (!response.ok) {
    throw new Error("Failed to load overlay settings.");
  }

  return response.json();
}

export async function saveOverlaySettings(
  settings: OverlaySettings
): Promise<void> {
  const response = await fetch("/api/overlay-settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    throw new Error("Failed to save overlay settings.");
  }
}

export function getOverlayLayoutClasses(
  position: OverlaySettings["position"],
  align: OverlaySettings["align"]
): string {
  const verticalClass =
    position === "top"
      ? "items-start pt-[8vh]"
      : position === "lower-third"
        ? "items-end pb-[18vh]"
        : "items-end";

  const horizontalClass =
    align === "left"
      ? "justify-start"
      : align === "right"
        ? "justify-end"
        : "justify-center";

  return `${verticalClass} ${horizontalClass}`;
}

export function getOverlayTextAlignClass(
  align: OverlaySettings["align"]
): string {
  if (align === "left") {
    return "text-left";
  }

  if (align === "right") {
    return "text-right";
  }

  return "text-center";
}

export { DEFAULT_OVERLAY_SETTINGS };
