import { OPENAI_TRANSLATION_CLIENT_SECRETS_URL } from "@/lib/openaiModels";

export function getOpenAIApiKey(): string | undefined {
  return process.env.OPENAI_API_KEY?.trim();
}

export function requireOpenAIApiKey(): string {
  const apiKey = getOpenAIApiKey();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  return apiKey;
}

export async function createOpenAITranslationClientSecret(
  session: Record<string, unknown>
): Promise<{ value: string; expiresAt: number }> {
  const response = await fetch(OPENAI_TRANSLATION_CLIENT_SECRETS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireOpenAIApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ session }),
  });

  const data = (await response.json()) as {
    value?: string;
    expires_at?: number;
    error?: { message?: string };
  };

  if (!response.ok || !data.value) {
    throw new Error(
      data.error?.message ??
        `OpenAI translation client secret request failed (${response.status})`
    );
  }

  return {
    value: data.value,
    expiresAt: data.expires_at ?? 0,
  };
}
