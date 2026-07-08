import {
  appendTranslationAudioChunk,
  getTranslationAudioChunksAfter,
  getTranslationListenState,
  setTranslationListenLive,
} from "@/lib/translationAudioStore";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const afterParam = request.nextUrl.searchParams.get("after");
  const afterSeq = afterParam ? Number.parseInt(afterParam, 10) : 0;

  if (afterParam && Number.isNaN(afterSeq)) {
    return NextResponse.json({ error: "Invalid after parameter." }, { status: 400 });
  }

  if (afterParam !== null) {
    const payload = await getTranslationAudioChunksAfter(afterSeq);
    return NextResponse.json(payload);
  }

  const state = await getTranslationListenState();
  return NextResponse.json(state);
}

export async function POST(request: NextRequest) {
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

  const chunk = await appendTranslationAudioChunk(body.mimeType, body.data);

  return NextResponse.json({ success: true, seq: chunk.seq });
}
