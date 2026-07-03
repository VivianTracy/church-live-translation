import { redis } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";

const CAPTION_STATE_KEY = "caption-state";

export async function GET() {
  const caption = await redis.get(CAPTION_STATE_KEY);

  return NextResponse.json(caption);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  await redis.set(CAPTION_STATE_KEY, body);

  return NextResponse.json({
    success: true,
  });
}