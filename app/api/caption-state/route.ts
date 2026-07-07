import {
  getLocalCaptionState,
  setLocalCaptionState,
} from "@/lib/localCaptionStore";
import { redis } from "@/lib/redis";
import { isLocalCaptionStorage } from "@/lib/storageMode";
import { NextRequest, NextResponse } from "next/server";

const CAPTION_STATE_KEY = "caption-state";

export async function GET() {
  if (isLocalCaptionStorage()) {
    return NextResponse.json(getLocalCaptionState());
  }

  const caption = await redis.get(CAPTION_STATE_KEY);

  return NextResponse.json(caption);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (isLocalCaptionStorage()) {
    setLocalCaptionState(body);
    return NextResponse.json({ success: true });
  }

  await redis.set(CAPTION_STATE_KEY, body);

  return NextResponse.json({
    success: true,
  });
}
