import { requiresChurchLogin } from "@/lib/audioTranslationSessionMode";
import {
  claimOperatorLoginForCurrentUser,
  operatorAuthErrorResponse,
  operatorLoginJson,
} from "@/lib/operatorLoginAccess";
import { NextResponse } from "next/server";

export async function POST() {
  if (!requiresChurchLogin()) {
    return NextResponse.json({ ok: true, recorded: false });
  }

  const claimed = await claimOperatorLoginForCurrentUser();

  if (!claimed.ok) {
    return operatorAuthErrorResponse(claimed);
  }

  return NextResponse.json({
    ok: true,
    ...operatorLoginJson(claimed.login),
  });
}
