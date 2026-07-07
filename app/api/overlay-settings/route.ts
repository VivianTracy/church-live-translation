import { redis } from "@/lib/redis";
import {
  normalizeOverlaySettings,
  type OverlaySettings,
} from "@/types/overlaySettings";
import { NextRequest, NextResponse } from "next/server";

const OVERLAY_SETTINGS_KEY = "overlay-settings";

export async function GET() {
  const settings = await redis.get<OverlaySettings>(OVERLAY_SETTINGS_KEY);

  return NextResponse.json(normalizeOverlaySettings(settings));
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as OverlaySettings;

  const settings = normalizeOverlaySettings({
    ...body,
    updatedAt: Date.now(),
  });

  await redis.set(OVERLAY_SETTINGS_KEY, settings);

  return NextResponse.json({ success: true, settings });
}
