import {
  CHURCH_BRIEF_NAME_TAKEN_MESSAGE,
  CHURCH_EMAIL_TAKEN_MESSAGE,
  churchRegisterErrorText,
  isExistingAuthUserError,
  mapChurchRegisterRpcError,
  parseChurchRegisterInput,
  parseRegisterChurchId,
} from "@/lib/churchRegister";
import {
  consumeChurchRegisterRateLimit,
  getClientIp,
} from "@/lib/churchRegisterRateLimit";
import { isChurchEmailConfigured, sendChurchEmail } from "@/lib/churchEmail";
import {
  buildChurchReviewEmail,
  createChurchVerificationToken,
  getChurchReviewEmail,
  getPublicAppOrigin,
} from "@/lib/churchVerification";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";
import { verifyOpenAIApiKey } from "@/lib/verifyOpenAIApiKey";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Church registration is not configured." },
      { status: 503 }
    );
  }

  if (!isChurchEmailConfigured()) {
    return NextResponse.json(
      { error: "Church review email is not configured." },
      { status: 503 }
    );
  }

  const limit = await consumeChurchRegisterRateLimit(getClientIp(request));

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many registration attempts. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      }
    );
  }

  const parsed = parseChurchRegisterInput(
    await request.json().catch(() => ({}))
  );

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const keyWorks = await verifyOpenAIApiKey(parsed.value.openaiApiKey);

  if (!keyWorks) {
    return NextResponse.json(
      { error: "This OpenAI key did not work. Check the key and try again." },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: existingChurch, error: slugLookupError } = await admin
    .from("churches")
    .select("id")
    .eq("slug", parsed.value.churchSlug)
    .maybeSingle();

  if (slugLookupError) {
    console.error("Church register slug lookup error:", slugLookupError);
  }

  if (existingChurch) {
    return NextResponse.json(
      { error: CHURCH_BRIEF_NAME_TAKEN_MESSAGE },
      { status: 409 }
    );
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: parsed.value.email,
    password: parsed.value.password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    if (isExistingAuthUserError(createError?.message)) {
      return NextResponse.json(
        { error: CHURCH_EMAIL_TAKEN_MESSAGE },
        { status: 409 }
      );
    }

    console.error("Church register createUser error:", createError);
    return NextResponse.json(
      { error: "Could not create the operator account." },
      { status: 500 }
    );
  }

  const userId = created.user.id;
  const { token, tokenHash } = createChurchVerificationToken();
  const { data: churchIdRaw, error: rpcError } = await admin.rpc(
    "register_church",
    {
      p_user_id: userId,
      p_name: parsed.value.churchName,
      p_slug: parsed.value.churchSlug,
      p_openai_api_key: parsed.value.openaiApiKey,
      p_key_last_four: parsed.value.keyLastFour,
      p_token_hash: tokenHash,
      p_operator_email: parsed.value.email,
    }
  );
  const churchId = parseRegisterChurchId(churchIdRaw);

  if (rpcError || !churchId) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Church register rollback error:", deleteError);
    }

    console.error("Church register_church error:", rpcError, churchIdRaw);
    const mapped = mapChurchRegisterRpcError(churchRegisterErrorText(rpcError));
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }

  const origin = getPublicAppOrigin(request.url);
  const reviewEmail = buildChurchReviewEmail({
    origin,
    token,
    details: {
      churchName: parsed.value.churchName,
      churchSlug: parsed.value.churchSlug,
      operatorEmail: parsed.value.email,
      keyLastFour: parsed.value.keyLastFour,
    },
  });
  const emailed = await sendChurchEmail({
    to: getChurchReviewEmail(),
    ...reviewEmail,
  });

  if (!emailed.ok) {
    console.error("Church review email failed:", emailed.error, {
      churchName: parsed.value.churchName,
      churchSlug: parsed.value.churchSlug,
      reviewUrl: `${origin}/verify-church/${token}`,
    });
  }

  return NextResponse.json({
    ok: true,
    pending: true,
    email: parsed.value.email,
    churchSlug: parsed.value.churchSlug,
  });
}
