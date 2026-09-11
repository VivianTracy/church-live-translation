import { requiresChurchLogin } from "@/lib/audioTranslationSessionMode";
import {
  parseChurchName,
  parseOpenAIApiKey,
  openAIKeyLastFour,
} from "@/lib/churchRegister";
import {
  getChurchOperatorForUser,
  getSignedInUser,
} from "@/lib/churchOperatorAccess";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyOpenAIApiKey } from "@/lib/verifyOpenAIApiKey";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  if (!requiresChurchLogin()) {
    return NextResponse.json(
      { error: "Church settings are only available after church sign-in." },
      { status: 400 }
    );
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
    churchName?: unknown;
    openaiApiKey?: unknown;
  };
  const churchName = parseChurchName(body.churchName);
  const openaiApiKey = parseOpenAIApiKey(body.openaiApiKey);
  const hasName = Object.prototype.hasOwnProperty.call(body, "churchName");
  const hasKey = Object.prototype.hasOwnProperty.call(body, "openaiApiKey");

  if (!hasName && !hasKey) {
    return NextResponse.json(
      { error: "Enter a church name or a new OpenAI key." },
      { status: 400 }
    );
  }

  if (hasName && !churchName) {
    return NextResponse.json(
      { error: "Enter the church name." },
      { status: 400 }
    );
  }

  if (hasKey && !openaiApiKey) {
    return NextResponse.json(
      { error: "Enter this church’s OpenAI API key." },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();

  if (churchName && churchName !== operator.churchName) {
    const { error } = await admin
      .from("churches")
      .update({ name: churchName })
      .eq("id", operator.churchId);

    if (error) {
      console.error("Church name update error:", error);
      return NextResponse.json(
        { error: "Could not update the church name." },
        { status: 500 }
      );
    }
  }

  if (openaiApiKey) {
    const keyWorks = await verifyOpenAIApiKey(openaiApiKey);

    if (!keyWorks) {
      return NextResponse.json(
        { error: "This OpenAI key did not work. Check the key and try again." },
        { status: 400 }
      );
    }

    const { error } = await admin.rpc("replace_church_openai_key", {
      p_church_id: operator.churchId,
      p_openai_api_key: openaiApiKey,
      p_key_last_four: openAIKeyLastFour(openaiApiKey),
    });

    if (error) {
      console.error("Church OpenAI key replace error:", error);
      return NextResponse.json(
        { error: "Could not save the OpenAI key." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    churchName: churchName ?? operator.churchName,
    churchSlug: operator.churchSlug,
    keyLastFour: openaiApiKey
      ? openAIKeyLastFour(openaiApiKey)
      : undefined,
  });
}
