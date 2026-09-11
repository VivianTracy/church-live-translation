import { requiresChurchLogin } from "@/lib/audioTranslationSessionMode";
import {
  getChurchOperatorForUser,
  getSignedInUser,
} from "@/lib/churchOperatorAccess";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { summarizeTranslationUsage } from "@/lib/translationUsage";
import { resolveTimeZone } from "@/lib/zonedTime";
import { NextRequest, NextResponse } from "next/server";

type SessionEventRow = {
  created_at: string;
  duration_seconds?: number | null;
};

export async function GET(request: NextRequest) {
  if (!requiresChurchLogin()) {
    return NextResponse.json({
      mode: "local",
      minutesToday: 0,
      minutesThisMonth: 0,
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

  const monthQuery = admin
    .from("translation_session_events")
    .select("created_at, duration_seconds")
    .eq("church_id", operator.churchId)
    .gte("created_at", monthStart.toISOString())
    .order("created_at", { ascending: false });
  const latestQuery = admin
    .from("translation_session_events")
    .select("created_at")
    .eq("church_id", operator.churchId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const [{ data: monthEvents, error: monthError }, { data: latest, error: latestError }] =
    await Promise.all([monthQuery, latestQuery]);

  let usageEvents: SessionEventRow[] | null = monthEvents;
  let usageError = monthError;

  if (usageError) {
    const fallback = await admin
      .from("translation_session_events")
      .select("created_at")
      .eq("church_id", operator.churchId)
      .gte("created_at", monthStart.toISOString())
      .order("created_at", { ascending: false });

    usageEvents = fallback.data;
    usageError = fallback.error;
  }

  if (usageError || latestError) {
    return NextResponse.json(
      { error: "Could not load church usage." },
      { status: 500 }
    );
  }

  const summary = summarizeTranslationUsage(
    (usageEvents ?? []).map((event) => ({
      createdAt: event.created_at,
      durationSeconds:
        typeof event.duration_seconds === "number" ? event.duration_seconds : null,
    })),
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
