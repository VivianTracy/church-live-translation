import { requiresChurchLogin } from "@/lib/audioTranslationSessionMode";
import { invalidateLocalOperatorSession } from "@/lib/operatorLoginAccess";
import { NextResponse } from "next/server";

export async function POST() {
  if (requiresChurchLogin()) {
    await invalidateLocalOperatorSession();
  }

  return NextResponse.json({ ok: true });
}
