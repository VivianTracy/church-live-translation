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

      const payload = await getTranslationAudioChunksAfter(afterSeq);
      return translationRelayJsonResponse(request, payload);
    }

    return translationRelayJsonResponse(request, {
      ...(await getTranslationListenState()),
      relayConfigured: isTranslationRelayConfigured(),
    });
  } catch (error) {
    return errorResponse(request, error, "Failed to load translation audio.");
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const chunk = await appendTranslationAudioChunk(body.mimeType, body.data);

    return translationRelayJsonResponse(request, { success: true, seq: chunk.seq });
  } catch (error) {
    return errorResponse(request, error, "Failed to upload translation audio.");
  }
}
