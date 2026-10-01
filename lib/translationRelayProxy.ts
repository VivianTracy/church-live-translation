import { applyTranslationRelayCors } from "@/lib/translationRelayCors";
import { getTranslationRelayOrigin } from "@/lib/translationRelayUrl";
import { NextResponse } from "next/server";

export const TRANSLATION_RELAY_PROXY_HEADER = "x-translation-relay-proxy";

export function shouldProxyTranslationRelay(request: Request): boolean {
  const relayOrigin = getTranslationRelayOrigin();

  if (!relayOrigin) {
    return false;
  }

  if (request.headers.get(TRANSLATION_RELAY_PROXY_HEADER)) {
    return false;
  }

  try {
    return new URL(request.url).origin.replace(/\/$/, "") !== relayOrigin;
  } catch {
    return true;
  }
}

export async function proxyTranslationRelay(
  request: Request
): Promise<NextResponse> {
  const relayOrigin = getTranslationRelayOrigin();

  if (!relayOrigin) {
    throw new Error("NEXT_PUBLIC_AUDIENCE_URL is not set.");
  }

  const incoming = new URL(request.url);
  const target = `${relayOrigin}${incoming.pathname}${incoming.search}`;
  const headers = new Headers();
  const contentType = request.headers.get("content-type");

  if (contentType) {
    headers.set("content-type", contentType);
  }

  headers.set(TRANSLATION_RELAY_PROXY_HEADER, "1");

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  let response: Response;

  try {
    response = await fetch(target, init);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not reach the phone page at ${relayOrigin} (${message}).`
    );
  }

  const nextResponse = new NextResponse(await response.arrayBuffer(), {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get("content-type") ?? "application/json",
    },
  });

  return applyTranslationRelayCors(request, nextResponse);
}
