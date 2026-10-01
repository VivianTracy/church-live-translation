import { isSupabaseConfigured, isVercelDeployment } from "@/lib/supabase/env";
import { getOpenAIApiKey } from "@/lib/openaiServer";

export function requiresChurchLogin(): boolean {
  return isVercelDeployment() || isSupabaseConfigured();
}

export function canUseLocalOpenAIKey(): boolean {
  return !requiresChurchLogin() && Boolean(getOpenAIApiKey());
}

export function resolveOutputLanguage(value: string | undefined): "en" | "zh" {
  return value === "zh" ? "zh" : "en";
}
