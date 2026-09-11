import { withChurchSearchParam } from "@/lib/churchSlug";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { getTranslationRelayApiUrl } from "@/lib/translationRelayUrl";
import type { TranslationListenState } from "@/types/translationListen";

async function fetchTranslationRelay(
  input: string,
  init?: RequestInit
): Promise<Response> {
  try {
    return await fetchWithTimeout(input, init, 6000);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not reach the phone relay (${message}). Headset translation still works.`
    );
  }
}

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
  state: TranslationListenState,
  churchSlug: string
): Promise<void> {
  const response = await fetchTranslationRelay(
    getTranslationRelayApiUrl(
      withChurchSearchParam("/api/translation-listen-state", churchSlug)
    ),
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

export async function loadTranslationListenState(
  churchSlug: string
): Promise<TranslationListenState & { churchName?: string | null }> {
  const response = await fetchWithTimeout(
    withChurchSearchParam("/api/translation-listen-state", churchSlug),
    {
      cache: "no-store",
    },
    4000
  );

  if (!response.ok) {
    throw new Error(
      await readApiError(response, "Failed to load translation listen state.")
    );
  }

  const data = (await response.json()) as TranslationListenState & {
    churchName?: string | null;
  };
  return {
    isLive: data.isLive,
    updatedAt: data.updatedAt,
    churchName: data.churchName,
  };
}

export async function clearTranslationListenState(
  churchSlug: string
): Promise<void> {
  await saveTranslationListenState(
    { isLive: false, updatedAt: Date.now() },
    churchSlug
  );
}

export async function loadTranslationRelayStatus(churchSlug: string): Promise<{
  relayConfigured: boolean;
  isLive: boolean;
  updatedAt: number;
}> {
  const response = await fetchTranslationRelay(
    getTranslationRelayApiUrl(
      withChurchSearchParam("/api/translation-listen-state", churchSlug)
    ),
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
