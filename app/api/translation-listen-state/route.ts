import {
  getTranslationListenState,
  isTranslationRelayConfigured,
  setTranslationListenLive,
} from "@/lib/translationAudioStore";
import { NextRequest, NextResponse } from "next/server";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;

  return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET() {
  try {
    return NextResponse.json({
      ...(await getTranslationListenState()),
      relayConfigured: isTranslationRelayConfigured(),
    });
  } catch (error) {
    return errorResponse(error, "Failed to load translation listen state.");
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isTranslationRelayConfigured()) {
      return NextResponse.json(
        {
          error:
            "Phone listeners require Redis. Set KV_REST_API_URL and KV_REST_API_TOKEN on Vercel.",
        },
        { status: 503 }
      );
    }

    const body = (await request.json()) as { isLive?: boolean };

    if (typeof body.isLive !== "boolean") {
      return NextResponse.json({ error: "isLive is required." }, { status: 400 });
    }

    await setTranslationListenLive(body.isLive);

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "Failed to save translation listen state.");
  }
}
