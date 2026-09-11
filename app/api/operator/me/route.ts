import { NextResponse } from "next/server";
import { requiresChurchLogin } from "@/lib/audioTranslationSessionMode";
import {
  getChurchOpenAIKeyLastFour,
  getChurchOperatorForUser,
  getSignedInUser,
} from "@/lib/churchOperatorAccess";
import { LOCAL_LISTEN_CHURCH_SLUG } from "@/lib/churchSlug";

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

  const user = await getSignedInUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in required." },
      { status: 401 }
    );
  }

  const operator = await getChurchOperatorForUser(user.id, user.email);

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
  });
}
