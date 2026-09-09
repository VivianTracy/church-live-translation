import { getTranslationRelayApiUrl } from "@/lib/translationRelayUrl";
import type { TranslationListenState } from "@/types/translationListen";

async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };

    if (body.error) {
      return body.error;
    }
  } catch {
    // Ignore JSON parse failures and fall back below.
  }

  return fallback;
}

export async function saveTranslationListenState(
  state: TranslationListenState
): Promise<void> {
  const response = await fetch(
    getTranslationRelayApiUrl("/api/translation-listen-state"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(state),
    }
  );

  if (!response.ok) {
    throw new Error(
      await readApiError(response, "Failed to save translation listen state.")
    );
  }
}

export async function loadTranslationListenState(): Promise<TranslationListenState> {
  const response = await fetch("/api/translation-listen-state", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      await readApiError(response, "Failed to load translation listen state.")
    );
  }

  const data = (await response.json()) as TranslationListenState;
  return {
    isLive: data.isLive,
    updatedAt: data.updatedAt,
  };
}

export async function clearTranslationListenState(): Promise<void> {
  await saveTranslationListenState({ isLive: false, updatedAt: Date.now() });
}

export async function loadTranslationRelayStatus(): Promise<{
  relayConfigured: boolean;
  isLive: boolean;
  updatedAt: number;
}> {
  const response = await fetch(
    getTranslationRelayApiUrl("/api/translation-listen-state"),
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      await readApiError(response, "Failed to load translation relay status.")
    );
  }

  const data = (await response.json()) as TranslationListenState & {
    relayConfigured?: boolean;
  };

  return {
    relayConfigured: data.relayConfigured !== false,
    isLive: data.isLive,
    updatedAt: data.updatedAt,
  };
}
