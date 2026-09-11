import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type TranslationSessionEvent = {
  churchId: string;
  userId: string;
  outputLanguage: "en" | "zh";
};

export async function recordTranslationSessionEvent(
  event: TranslationSessionEvent
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("translation_session_events").insert({
    church_id: event.churchId,
    user_id: event.userId,
    output_language: event.outputLanguage,
  });

  if (error) {
    throw new Error(`Failed to record translation session: ${error.message}`);
  }
}
