import { requiresChurchLogin } from "@/lib/audioTranslationSessionMode";
import {
  getChurchOperatorForUser,
  getSignedInUser,
} from "@/lib/churchOperatorAccess";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  isSessionEventId,
  normalizeDurationSeconds,
} from "@/lib/translationUsage";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!requiresChurchLogin()) {
    return NextResponse.json({ ok: true, recorded: false });
  }

  const user = await getSignedInUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const operator = await getChurchOperatorForUser(user.id, user.email);

  if (!operator) {
    return NextResponse.json(
      { error: "This account is not an authorized church operator." },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    sessionEventId?: unknown;
    durationSeconds?: unknown;
  };
  const sessionEventId = isSessionEventId(body.sessionEventId)
    ? body.sessionEventId
    : null;
  const durationSeconds = normalizeDurationSeconds(body.durationSeconds);

  if (!sessionEventId || durationSeconds === null) {
    return NextResponse.json(
      { error: "sessionEventId and durationSeconds are required." },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("translation_session_events")
    .update({ duration_seconds: durationSeconds })
    .eq("id", sessionEventId)
    .eq("church_id", operator.churchId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Translation session duration error:", error);
    return NextResponse.json({ ok: true, recorded: false });
  }

  return NextResponse.json({
    ok: true,
    recorded: Boolean(data?.id),
  });
}
