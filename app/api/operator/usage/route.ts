import { requiresChurchLogin } from "@/lib/audioTranslationSessionMode";
import {
  getChurchOperatorForUser,
  getSignedInUser,
} from "@/lib/churchOperatorAccess";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { summarizeTranslationUsage } from "@/lib/translationUsage";
import { resolveTimeZone } from "@/lib/zonedTime";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  if (!requiresChurchLogin()) {
    return NextResponse.json({
      mode: "local",
      sessionsToday: 0,
      sessionsThisMonth: 0,
      lastStartedAt: null,
    });
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

  const timeZone = resolveTimeZone(
    request.nextUrl.searchParams.get("timeZone")
  );
  const admin = createSupabaseAdminClient();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  monthStart.setUTCDate(monthStart.getUTCDate() - 1);

  const [{ data: monthEvents, error: monthError }, { data: latest, error: latestError }] =
    await Promise.all([
      admin
        .from("translation_session_events")
        .select("created_at")
        .eq("church_id", operator.churchId)
        .gte("created_at", monthStart.toISOString())
        .order("created_at", { ascending: false }),
      admin
        .from("translation_session_events")
        .select("created_at")
        .eq("church_id", operator.churchId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (monthError || latestError) {
    return NextResponse.json(
      { error: "Could not load church usage." },
      { status: 500 }
    );
  }

  const summary = summarizeTranslationUsage(
    (monthEvents ?? []).map((event) => ({ createdAt: event.created_at })),
    new Date(),
    timeZone,
    latest?.created_at ?? null
  );

  return NextResponse.json({
    mode: "church",
    timeZone,
    ...summary,
  });
}
