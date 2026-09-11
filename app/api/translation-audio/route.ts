import {
  InvalidListenChurchError,
  UnknownListenChurchError,
  requireListenChurchSlug,
} from "@/lib/churchListen";
import {
  appendTranslationAudioChunk,
  getTranslationAudioChunksAfter,
  getTranslationListenState,
  isTranslationRelayConfigured,
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
    const afterParam = request.nextUrl.searchParams.get("after");

    if (afterParam !== null) {
      const afterSeq = Number.parseInt(afterParam, 10);

      if (Number.isNaN(afterSeq)) {
        return translationRelayJsonResponse(
          request,
          { error: "Invalid after parameter." },
          { status: 400 }
        );
      }

      const payload = await getTranslationAudioChunksAfter(slug, afterSeq);
      return translationRelayJsonResponse(request, {
        ...payload,
        churchName: church?.name ?? null,
      });
    }

    return translationRelayJsonResponse(request, {
      ...(await getTranslationListenState(slug)),
      churchName: church?.name ?? null,
      relayConfigured: isTranslationRelayConfigured(),
    });
  } catch (error) {
    return errorResponse(request, error, "Failed to load translation audio.");
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
    const body = (await request.json()) as {
      mimeType?: string;
      data?: string;
    };

    if (!body.mimeType || !body.data) {
      return translationRelayJsonResponse(
        request,
        { error: "mimeType and data are required." },
        { status: 400 }
      );
    }

    if (body.data.length > 200_000) {
      return translationRelayJsonResponse(
        request,
        { error: "Audio chunk is too large." },
        { status: 413 }
      );
    }

    const chunk = await appendTranslationAudioChunk(
      slug,
      body.mimeType,
      body.data
    );

    return translationRelayJsonResponse(request, { success: true, seq: chunk.seq });
  } catch (error) {
    return errorResponse(request, error, "Failed to upload translation audio.");
  }
}
