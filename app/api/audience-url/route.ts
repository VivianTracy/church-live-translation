import { getTranslationListenUrl } from "@/lib/audienceUrl";
import { requiresChurchLogin } from "@/lib/audioTranslationSessionMode";
import { getChurchOperatorFromRequest } from "@/lib/churchOperatorAccess";
import { LOCAL_LISTEN_CHURCH_SLUG } from "@/lib/churchSlug";
import { getTranslationRelayOrigin } from "@/lib/translationRelayUrl";
import { NextResponse } from "next/server";

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
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
  const origin = configuredOrigin ?? `${protocol}://${host}`;
  const source: "env" | "request-host" | "local-dev" | "local-dev-relay" =
    configuredOrigin
      ? isLocalHostname(hostname)
        ? "local-dev-relay"
        : "env"
      : isLocalHostname(hostname)
        ? "local-dev"
        : "request-host";
  let churchSlug = LOCAL_LISTEN_CHURCH_SLUG;

  if (requiresChurchLogin()) {
    const operator = await getChurchOperatorFromRequest();

    if (operator) {
      churchSlug = operator.churchSlug;
    }
  }

  return NextResponse.json({
    listenUrl: getTranslationListenUrl(origin, churchSlug),
    churchSlug,
    source,
  });
}
