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
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function getTranslationRelayApiUrl(path: string): string {
  const relayOrigin = getTranslationRelayOrigin();

  if (!relayOrigin) {
    return path;
  }

  if (typeof window !== "undefined") {
    const currentOrigin = window.location.origin.replace(/\/$/, "");

    if (relayOrigin === currentOrigin) {
      return path;
    }
  }

  return `${relayOrigin}${path}`;
}

export function isUsingRemoteTranslationRelay(): boolean {
  const relayOrigin = getTranslationRelayOrigin();

  if (!relayOrigin || typeof window === "undefined") {
    return false;
  }

  return relayOrigin !== window.location.origin.replace(/\/$/, "");
}
