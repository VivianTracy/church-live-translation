import { getOpenAIApiKey } from "@/lib/openaiServer";
import { isSupabaseConfigured, isVercelDeployment } from "@/lib/supabase/env";
import {
  isTranslationLanguageCode,
  type TranslationLanguageCode,
} from "@/lib/translationLanguages";

export function requiresChurchLogin(): boolean {
  return isVercelDeployment() || isSupabaseConfigured();
}

export function canUseLocalOpenAIKey(): boolean {
  return !requiresChurchLogin() && Boolean(getOpenAIApiKey());
}

export function resolveOutputLanguage(
  value: string | undefined
): TranslationLanguageCode {
  return isTranslationLanguageCode(value) ? value : "en";
}

export type TranslationNoiseReduction = "near_field" | "far_field";

/** Board and OBS feeds are close-miked. A room mic is not. */
export function resolveNoiseReduction(
  inputSource: string | undefined
): TranslationNoiseReduction {
  return inputSource === "microphone" ? "far_field" : "near_field";
}
