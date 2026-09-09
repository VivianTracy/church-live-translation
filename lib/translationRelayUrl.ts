function normalizeOrigin(value: string | undefined): string | undefined {
  return value?.trim().replace(/\/$/, "") || undefined;
}

export function getTranslationRelayOrigin(): string | undefined {
  return (
    normalizeOrigin(process.env.NEXT_PUBLIC_RELAY_URL) ??
    normalizeOrigin(process.env.NEXT_PUBLIC_AUDIENCE_URL)
  );
}

export function isLocalDevHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
}

export function getTranslationRelayApiUrl(path: string): string {
  // Operator writes go to this computer's Next server, which uses the
  // local Redis/KV env. Phones read from the deployed /listen page.
  return path;
}

export function isUsingRemoteTranslationRelay(): boolean {
  const relayOrigin = getTranslationRelayOrigin();

  if (!relayOrigin || typeof window === "undefined") {
    return false;
  }

  return relayOrigin !== window.location.origin.replace(/\/$/, "");
}
