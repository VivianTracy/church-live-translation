import { sendChurchEmail } from "@/lib/churchEmail";
import {
  buildChurchApprovedEmail,
  getPublicAppOrigin,
  parseChurchVerificationToken,
} from "@/lib/churchVerification";
import { confirmChurchVerification } from "@/lib/churchVerificationAccess";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Church review is not configured." },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { token?: unknown };
  const token = parseChurchVerificationToken(body.token);

  if (!token) {
    return NextResponse.json(
      { error: "This review link is not valid." },
      { status: 400 }
    );
  }

  const confirmed = await confirmChurchVerification(token);

  if (!confirmed.ok) {
    return NextResponse.json(
      {
        error:
          confirmed.error === "not_found"
            ? "This review link is not valid."
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
  const emailed = await sendChurchEmail({
    to: confirmed.record.operatorEmail,
    ...approvedEmail,
  });

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
