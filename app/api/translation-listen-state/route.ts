import {
  getTranslationListenState,
  setTranslationListenLive,
} from "@/lib/translationAudioStore";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(await getTranslationListenState());
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { isLive?: boolean };

  if (typeof body.isLive !== "boolean") {
    return NextResponse.json({ error: "isLive is required." }, { status: 400 });
  }

  await setTranslationListenLive(body.isLive);

  return NextResponse.json({ success: true });
}
