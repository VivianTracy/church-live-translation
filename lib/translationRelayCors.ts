import { NextResponse } from "next/server";

export function applyTranslationRelayCors(
  request: Request,
  response: NextResponse
): NextResponse {
  const origin = request.headers.get("Origin");

  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    response.headers.append("Vary", "Origin");
  }

  return response;
}

export function translationRelayOptionsResponse(request: Request): NextResponse {
  return applyTranslationRelayCors(request, new NextResponse(null, { status: 204 }));
}

export function translationRelayJsonResponse(
  request: Request,
  body: unknown,
  init?: ResponseInit
): NextResponse {
  return applyTranslationRelayCors(request, NextResponse.json(body, init));
}
