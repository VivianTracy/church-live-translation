import { getTranslationRelayOrigin } from "@/lib/translationRelayUrl";
import { NextResponse } from "next/server";

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    requestUrl.host;
  const hostname = host.split(":")[0] ?? "localhost";
  const protocol =
    request.headers.get("x-forwarded-proto") ??
    (isLocalHostname(hostname) ? "http" : "https");
  const configuredOrigin = getTranslationRelayOrigin();

  if (configuredOrigin) {
    return NextResponse.json({
      listenUrl: `${configuredOrigin}/listen`,
      source: isLocalHostname(hostname) ? "local-dev-relay" : "env",
    });
  }

  if (isLocalHostname(hostname)) {
    return NextResponse.json({
      listenUrl: `${protocol}://${host}/listen`,
      source: "local-dev",
    });
  }

  return NextResponse.json({
    listenUrl: `${protocol}://${host}/listen`,
    source: "request-host",
  });
}
