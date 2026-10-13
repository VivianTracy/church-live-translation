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
