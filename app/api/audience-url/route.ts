import { NextResponse } from "next/server";

function getConfiguredAudienceOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_AUDIENCE_URL?.trim().replace(/\/$/, "");

  return configured || null;
}

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

  // During local dev, always QR-link to the server you are actually running.
  if (isLocalHostname(hostname)) {
    return NextResponse.json({
      listenUrl: `${protocol}://${host}/listen`,
      source: "local-dev",
    });
  }

  const configuredOrigin = getConfiguredAudienceOrigin();

  if (configuredOrigin) {
    return NextResponse.json({
      listenUrl: `${configuredOrigin}/listen`,
      source: "env",
    });
  }

  return NextResponse.json({
    listenUrl: `${protocol}://${host}/listen`,
    source: "request-host",
  });
}
