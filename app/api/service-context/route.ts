import {
  readServiceContext,
} from "@/lib/serviceContext";
import { redis } from "@/lib/redis";
import { ServiceContext } from "@/types/serviceContext";
import { NextRequest, NextResponse } from "next/server";

const SERVICE_CONTEXT_KEY = "service-context";

export async function GET() {
  const context = await readServiceContext();

  return NextResponse.json(context);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const sermonText =
    typeof body.sermonText === "string" ? body.sermonText.trim() : "";

  const context: ServiceContext = {
    sermonText,
    updatedAt: Date.now(),
  };

  await redis.set(SERVICE_CONTEXT_KEY, context);

  return NextResponse.json({
    success: true,
    context,
  });
}
