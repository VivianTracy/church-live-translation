import type { TranslationListenState } from "@/types/translationListen";

export async function saveTranslationListenState(
  state: TranslationListenState
): Promise<void> {
  const response = await fetch("/api/translation-listen-state", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(state),
  });

  if (!response.ok) {
    throw new Error("Failed to save translation listen state.");
  }
}

export async function loadTranslationListenState(): Promise<TranslationListenState> {
  const response = await fetch("/api/translation-listen-state");

  if (!response.ok) {
    throw new Error("Failed to load translation listen state.");
  }

  return response.json();
}

export async function clearTranslationListenState(): Promise<void> {
  await saveTranslationListenState({ isLive: false, updatedAt: Date.now() });
}
