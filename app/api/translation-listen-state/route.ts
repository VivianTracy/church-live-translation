import {
  InvalidListenChurchError,
  UnknownListenChurchError,
  requireListenChurchSlug,
} from "@/lib/churchListen";
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
  if (error instanceof InvalidListenChurchError) {
    return translationRelayJsonResponse(
      request,
      { error: error.message },
      { status: 400 }
    );
  }

  if (error instanceof UnknownListenChurchError) {
    return translationRelayJsonResponse(
      request,
      { error: error.message },
      { status: 404 }
    );
  }

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

    const { slug, church } = await requireListenChurchSlug(
      request.nextUrl.searchParams.get("church")
    );

    return translationRelayJsonResponse(request, {
      ...(await getTranslationListenState(slug)),
      churchName: church?.name ?? null,
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

    const { slug } = await requireListenChurchSlug(
      request.nextUrl.searchParams.get("church")
    );
    const body = (await request.json()) as { isLive?: boolean };

    if (typeof body.isLive !== "boolean") {
      return translationRelayJsonResponse(
        request,
        { error: "isLive is required." },
        { status: 400 }
      );
    }

    await setTranslationListenLive(slug, body.isLive);

    return translationRelayJsonResponse(request, { success: true });
  } catch (error) {
    return errorResponse(request, error, "Failed to save translation listen state.");
  }
}
