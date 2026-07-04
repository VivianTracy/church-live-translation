import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    redisConfigured: Boolean(
      process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
    ),
  });
}
