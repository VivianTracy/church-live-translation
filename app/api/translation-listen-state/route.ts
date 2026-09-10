import {
  getTranslationListenState,
  isTranslationRelayConfigured,
  setTranslationListenLive,
} from "@/lib/translationAudioStore";
import {
  translationRelayJsonResponse,
  translationRelayOptionsResponse,
} from "@/lib/translationRelayCors";
import {
  proxyTranslationRelay,
  shouldProxyTranslationRelay,
} from "@/lib/translationRelayProxy";
import { NextRequest } from "next/server";

function errorResponse(request: NextRequest, error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;

  return translationRelayJsonResponse(request, { error: message }, { status: 500 });
}

export async function OPTIONS(request: NextRequest) {
  return translationRelayOptionsResponse(request);
}

export async function GET(request: NextRequest) {
  try {
    if (shouldProxyTranslationRelay(request)) {
      return await proxyTranslationRelay(request);
    }

    return translationRelayJsonResponse(request, {
      ...(await getTranslationListenState()),
      relayConfigured: isTranslationRelayConfigured(),
    });
  } catch (error) {
    return errorResponse(request, error, "Failed to load translation listen state.");
  }
}

export async function POST(request: NextRequest) {
  try {
    if (shouldProxyTranslationRelay(request)) {
      return await proxyTranslationRelay(request);
    }

    const body = (await request.json()) as { isLive?: boolean };

    if (typeof body.isLive !== "boolean") {
      return translationRelayJsonResponse(
        request,
        { error: "isLive is required." },
        { status: 400 }
      );
    }

    await setTranslationListenLive(body.isLive);

    return translationRelayJsonResponse(request, { success: true });
  } catch (error) {
    return errorResponse(request, error, "Failed to save translation listen state.");
  }
}
