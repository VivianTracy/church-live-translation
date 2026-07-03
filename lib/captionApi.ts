import { CaptionState } from "@/types/caption";

export async function saveCaptionState(state: CaptionState) {
  const response = await fetch("/api/caption-state", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(state),
  });

  if (!response.ok) {
    throw new Error("Failed to save caption state.");
  }
}

export async function loadCaptionState(): Promise<CaptionState | null> {
  const response = await fetch("/api/caption-state");

  if (!response.ok) {
    throw new Error("Failed to load caption state.");
  }

  return response.json();
}