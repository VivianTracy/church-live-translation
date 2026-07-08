import {
  appendTranslationAudioChunk,
  getTranslationAudioChunksAfter,
  getTranslationListenState,
  isTranslationRelayConfigured,
  setTranslationListenLive,
} from "@/lib/translationAudioStore";
import { NextRequest, NextResponse } from "next/server";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;

  return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const afterParam = request.nextUrl.searchParams.get("after");

    if (afterParam !== null) {
      const afterSeq = Number.parseInt(afterParam, 10);

      if (Number.isNaN(afterSeq)) {
        return NextResponse.json({ error: "Invalid after parameter." }, { status: 400 });
      }

      const payload = await getTranslationAudioChunksAfter(afterSeq);
      return NextResponse.json(payload);
    }

    return NextResponse.json({
      ...(await getTranslationListenState()),
      relayConfigured: isTranslationRelayConfigured(),
    });
  } catch (error) {
    return errorResponse(error, "Failed to load translation audio.");
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isTranslationRelayConfigured()) {
      return NextResponse.json(
        {
          error:
            "Phone audio relay requires Redis. Set KV_REST_API_URL and KV_REST_API_TOKEN, then use the deployed operator URL.",
        },
        { status: 503 }
      );
    }

    const body = (await request.json()) as {
      mimeType?: string;
      data?: string;
    };

    if (!body.mimeType || !body.data) {
      return NextResponse.json(
        { error: "mimeType and data are required." },
        { status: 400 }
      );
    }

    if (body.data.length > 200_000) {
      return NextResponse.json({ error: "Audio chunk is too large." }, { status: 413 });
    }

    const chunk = await appendTranslationAudioChunk(body.mimeType, body.data);

    return NextResponse.json({ success: true, seq: chunk.seq });
  } catch (error) {
    return errorResponse(error, "Failed to upload translation audio.");
  }
}
