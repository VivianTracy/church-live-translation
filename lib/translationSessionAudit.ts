import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { TranslationLanguageCode } from "@/lib/translationLanguages";

export type TranslationSessionEvent = {
  churchId: string;
  userId: string;
  outputLanguage: TranslationLanguageCode;
};

export async function recordTranslationSessionEvent(
  event: TranslationSessionEvent
): Promise<string> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("translation_session_events")
    .insert({
      church_id: event.churchId,
      user_id: event.userId,
      output_language: event.outputLanguage,
    })
    .select("id")
    .single();

  if (error || typeof data?.id !== "string") {
    throw new Error(
      `Failed to record translation session: ${error?.message ?? "missing id"}`
    );
  }

  return data.id;
}
