import { requiresChurchLogin } from "@/lib/audioTranslationSessionMode";
import {
  operatorAuthErrorResponse,
  operatorLoginJson,
  touchCurrentOperatorTranslation,
} from "@/lib/operatorLoginAccess";
import { NextResponse } from "next/server";

export async function POST() {
  if (!requiresChurchLogin()) {
    return NextResponse.json({ ok: true, recorded: false });
  }

  const touched = await touchCurrentOperatorTranslation();

  if (!touched.ok) {
    return operatorAuthErrorResponse(touched);
  }

  return NextResponse.json({
    ok: true,
    ...operatorLoginJson(touched.login),
  });
}
