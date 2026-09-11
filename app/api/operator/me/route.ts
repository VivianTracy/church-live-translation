import { NextResponse } from "next/server";
import { requiresChurchLogin } from "@/lib/audioTranslationSessionMode";
import {
  getChurchOperatorForUser,
  getSignedInUser,
} from "@/lib/churchOperatorAccess";

export async function GET() {
  if (!requiresChurchLogin()) {
    return NextResponse.json({
      mode: "local",
      churchName: null,
      email: null,
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
    email: operator.email,
  });
}
