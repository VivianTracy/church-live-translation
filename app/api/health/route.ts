import {
  canUseLocalOpenAIKey,
  requiresChurchLogin,
} from "@/lib/audioTranslationSessionMode";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    churchLoginConfigured: isSupabaseConfigured(),
    requiresChurchLogin: requiresChurchLogin(),
    localOpenAIKey: canUseLocalOpenAIKey(),
  });
}
