import { NextResponse } from "next/server";
import { requiresChurchLogin } from "@/lib/audioTranslationSessionMode";
import {
  getChurchOpenAIKeyLastFour,
  getChurchOperatorForUser,
} from "@/lib/churchOperatorAccess";
import { LOCAL_LISTEN_CHURCH_SLUG } from "@/lib/churchSlug";
import {
  getActiveOperatorUser,
  operatorAuthErrorResponse,
  operatorLoginJson,
} from "@/lib/operatorLoginAccess";

export async function GET() {
  if (!requiresChurchLogin()) {
    return NextResponse.json({
      mode: "local",
      churchName: null,
      churchSlug: LOCAL_LISTEN_CHURCH_SLUG,
      email: null,
      keyLastFour: null,
    });
  }

  const active = await getActiveOperatorUser();

  if (!active.ok) {
    return operatorAuthErrorResponse(active);
  }

  const operator = await getChurchOperatorForUser(
    active.user.id,
    active.user.email
  );

  if (!operator) {
    return NextResponse.json(
      { error: "This account is not an authorized church operator." },
      { status: 403 }
    );
  }

  return NextResponse.json({
    mode: "church",
    churchName: operator.churchName,
    churchSlug: operator.churchSlug,
    email: operator.email,
    keyLastFour: await getChurchOpenAIKeyLastFour(operator.churchId),
    ...operatorLoginJson(active.login),
  });
}
