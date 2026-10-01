import { consumeDemoLoginRateLimit, signInDemoOperator } from "@/lib/demoLogin";
import { requiresChurchLogin } from "@/lib/audioTranslationSessionMode";
import { OPERATOR_DEMO_MS } from "@/lib/operatorLogin";
import {
  claimOperatorLoginForCurrentUser,
  invalidateLocalOperatorSession,
  operatorAuthErrorResponse,
  operatorLoginJson,
} from "@/lib/operatorLoginAccess";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!requiresChurchLogin()) {
    return NextResponse.json(
      { error: "Demo sign-in is not configured on this computer." },
      { status: 400 }
    );
  }

  const limit = await consumeDemoLoginRateLimit(request);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many demo starts. Wait a few minutes and try again." },
      { status: 429 }
    );
  }

  try {
    const signedIn = await signInDemoOperator();

    if (!signedIn.ok) {
      return NextResponse.json(
        { error: "Could not start the demo." },
        { status: 500 }
      );
    }

    const claimed = await claimOperatorLoginForCurrentUser({
      sessionExpiresAt: new Date(Date.now() + OPERATOR_DEMO_MS).toISOString(),
    });

    if (!claimed.ok) {
      await invalidateLocalOperatorSession();
      return operatorAuthErrorResponse(claimed);
    }

    return NextResponse.json({
      ok: true,
      ...operatorLoginJson(claimed.login),
    });
  } catch (error) {
    console.error("Demo login error:", error);
    return NextResponse.json(
      { error: "Could not start the demo." },
      { status: 500 }
    );
  }
}
