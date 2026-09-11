import {
  getChurchOperatorForUser,
  getDecryptedChurchOpenAIApiKey,
  getSignedInUser,
} from "@/lib/churchOperatorAccess";
import { requiresChurchLogin } from "@/lib/audioTranslationSessionMode";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getOpenAIApiKey } from "@/lib/openaiServer";
import { recordTranslationSessionEvent } from "@/lib/translationSessionAudit";
import { consumeTranslationSessionRateLimit } from "@/lib/translationSessionRateLimit";
import type { ChurchOperatorContext } from "@/lib/churchOperator";

export {
  canUseLocalOpenAIKey,
  requiresChurchLogin,
  resolveOutputLanguage,
} from "@/lib/audioTranslationSessionMode";

export type AudioTranslationSessionFailure = {
  ok: false;
  status: number;
  error: string;
  retryAfterSeconds?: number;
};

export type AudioTranslationSessionSuccess = {
  ok: true;
  apiKey: string;
  operator: ChurchOperatorContext | null;
};

export type AudioTranslationSessionAuthResult =
  | AudioTranslationSessionSuccess
  | AudioTranslationSessionFailure;

export async function authorizeAudioTranslationSession(): Promise<AudioTranslationSessionAuthResult> {
  if (!requiresChurchLogin()) {
    const apiKey = getOpenAIApiKey();

    if (!apiKey) {
      return {
        ok: false,
        status: 500,
        error: "OPENAI_API_KEY is not configured",
      };
    }

    return { ok: true, apiKey, operator: null };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      status: 503,
      error: "Church sign-in is not configured",
    };
  }

  const user = await getSignedInUser();

  if (!user) {
    return {
      ok: false,
      status: 401,
      error: "Sign in as a church operator to start translation.",
    };
  }

  const operator = await getChurchOperatorForUser(user.id, user.email);

  if (!operator) {
    return {
      ok: false,
      status: 403,
      error: "This account is not an authorized church operator.",
    };
  }

  const rateLimit = await consumeTranslationSessionRateLimit({
    churchId: operator.churchId,
    userId: operator.userId,
  });

  if (!rateLimit.allowed) {
    return {
      ok: false,
      status: 429,
      error: "Too many translation sessions. Wait a few minutes and try again.",
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    };
  }

  let apiKey: string | null;

  try {
    apiKey = await getDecryptedChurchOpenAIApiKey(operator.churchId);
  } catch (error) {
    console.error("Church OpenAI key decrypt error:", error);
    return {
      ok: false,
      status: 500,
      error: "This church is not configured for translation yet.",
    };
  }

  if (!apiKey) {
    return {
      ok: false,
      status: 503,
      error: "This church is not configured for translation yet.",
    };
  }

  return { ok: true, apiKey, operator };
}

export async function recordAuthorizedTranslationSession(input: {
  operator: ChurchOperatorContext | null;
  outputLanguage: "en" | "zh";
}): Promise<void> {
  if (!input.operator) {
    return;
  }

  try {
    await recordTranslationSessionEvent({
      churchId: input.operator.churchId,
      userId: input.operator.userId,
      outputLanguage: input.outputLanguage,
    });
  } catch (error) {
    console.error("Translation session audit error:", error);
  }
}
