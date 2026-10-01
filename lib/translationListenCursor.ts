const LIVE_HINT_PREFIX = "translation-live:";
const LIVE_HINT_TTL_MS = 3 * 60 * 1000;

export const LIVE_CATCHUP_CHUNKS = 4;
export const MAX_PLAYBACK_BEHIND_CHUNKS = 8;

export function liveListenCursor(
  latestSeq: number,
  catchupChunks = LIVE_CATCHUP_CHUNKS
): number {
  return Math.max(0, latestSeq - catchupChunks);
}

export function nextListenCursor(
  lastSeq: number,
  latestSeq: number,
  maxBehind = MAX_PLAYBACK_BEHIND_CHUNKS
): number {
  if (latestSeq - lastSeq > maxBehind) {
    return liveListenCursor(latestSeq);
  }

  return lastSeq;
}

function liveHintKey(churchSlug: string): string {
  return `${LIVE_HINT_PREFIX}${churchSlug}`;
}

export function readRecentLiveHint(
  churchSlug: string,
  now = Date.now()
): boolean {
  try {
    const storedAt = Number(sessionStorage.getItem(liveHintKey(churchSlug)));
    return Number.isFinite(storedAt) && now - storedAt < LIVE_HINT_TTL_MS;
  } catch {
    return false;
  }
}

export function writeLiveHint(churchSlug: string, isLive: boolean): void {
  try {
    if (isLive) {
      sessionStorage.setItem(liveHintKey(churchSlug), String(Date.now()));
      return;
    }

    sessionStorage.removeItem(liveHintKey(churchSlug));
  } catch {
    // Private browsing can block sessionStorage.
  }
}
