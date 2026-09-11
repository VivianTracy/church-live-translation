import { sendChurchEmail } from "@/lib/churchEmail";
import {
  buildChurchApprovedEmail,
  getPublicAppOrigin,
  isChurchReviewer,
  parseChurchId,
} from "@/lib/churchVerification";
import {
  confirmChurchById,
  listPendingChurchReviews,
} from "@/lib/churchVerificationAccess";
import { getSignedInUser } from "@/lib/churchOperatorAccess";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";
import { NextResponse } from "next/server";

async function requireChurchReviewer() {
  if (!isSupabaseAdminConfigured()) {
    return {
      error: NextResponse.json(
        { error: "Church review is not configured." },
        { status: 503 }
      ),
    };
  }

  const user = await getSignedInUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Sign in required." }, { status: 401 }),
    };
  }

  if (!isChurchReviewer(user.email)) {
    return {
      error: NextResponse.json(
        { error: "This page is only for church review." },
        { status: 403 }
      ),
    };
  }

  return { user };
}

export async function GET() {
  const access = await requireChurchReviewer();

  if ("error" in access) {
    return access.error;
  }

  const churches = await listPendingChurchReviews();

  return NextResponse.json({
    churches: churches.map((church) => ({
      churchId: church.churchId,
      churchName: church.churchName,
      churchSlug: church.churchSlug,
      operatorEmail: church.operatorEmail,
      keyLastFour: church.keyLastFour,
    })),
  });
}

export async function POST(request: Request) {
  const access = await requireChurchReviewer();

  if ("error" in access) {
    return access.error;
  }

  const body = (await request.json().catch(() => ({}))) as { churchId?: unknown };
  const churchId = parseChurchId(body.churchId);

  if (!churchId) {
    return NextResponse.json(
      { error: "This church cannot be confirmed." },
      { status: 400 }
    );
  }

  const confirmed = await confirmChurchById(churchId);

  if (!confirmed.ok) {
    return NextResponse.json(
      {
        error:
          confirmed.error === "not_found"
            ? "This church is not waiting for confirmation."
            : "This church cannot be confirmed.",
      },
      { status: confirmed.error === "not_found" ? 404 : 409 }
    );
  }

  if (confirmed.alreadyConfirmed) {
    return NextResponse.json({
      ok: true,
      alreadyConfirmed: true,
      emailedOperator: false,
      churchName: confirmed.record.churchName,
    });
  }

  const origin = getPublicAppOrigin(request.url);
  const approvedEmail = buildChurchApprovedEmail({
    origin,
    churchName: confirmed.record.churchName,
  });
  const emailed = confirmed.record.operatorEmail
    ? await sendChurchEmail({
        to: confirmed.record.operatorEmail,
        ...approvedEmail,
      })
    : { ok: false as const, error: "Operator email is missing." };

  if (!emailed.ok) {
    console.error("Church approved email failed:", emailed.error, {
      churchName: confirmed.record.churchName,
      operatorEmail: confirmed.record.operatorEmail,
    });
  }

  return NextResponse.json({
    ok: true,
    alreadyConfirmed: false,
    emailedOperator: emailed.ok,
    churchName: confirmed.record.churchName,
  });
}
