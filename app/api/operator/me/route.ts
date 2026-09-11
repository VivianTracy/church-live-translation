import { NextResponse } from "next/server";
import { requiresChurchLogin } from "@/lib/audioTranslationSessionMode";
import { CHURCH_PENDING_LOGIN_MESSAGE } from "@/lib/churchOperator";
import {
  getChurchAccessForUser,
  getChurchOpenAIKeyLastFour,
  getSignedInUser,
} from "@/lib/churchOperatorAccess";
import { LOCAL_LISTEN_CHURCH_SLUG } from "@/lib/churchSlug";
import { isChurchReviewer } from "@/lib/churchVerification";

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

  const access = await getChurchAccessForUser(user.id, user.email);

  if (!access.ok && access.reason === "pending") {
    return NextResponse.json(
      {
        error: CHURCH_PENDING_LOGIN_MESSAGE,
        code: "church_pending",
        churchName: access.churchName ?? null,
        email: user.email ?? null,
      },
      { status: 403 }
    );
  }

  if (!access.ok) {
    return NextResponse.json(
      { error: "This account is not an authorized church operator." },
      { status: 403 }
    );
  }

  const operator = access.operator;

  return NextResponse.json({
    mode: "church",
    churchName: operator.churchName,
    churchSlug: operator.churchSlug,
    email: operator.email,
    keyLastFour: await getChurchOpenAIKeyLastFour(operator.churchId),
    isReviewer: isChurchReviewer(operator.email),
  });
}
