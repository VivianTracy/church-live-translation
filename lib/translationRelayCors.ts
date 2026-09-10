import { NextResponse } from "next/server";

export function applyTranslationRelayCors(
  _request: Request,
  response: NextResponse
): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");

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
