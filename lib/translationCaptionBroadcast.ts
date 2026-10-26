import { withChurchSearchParam } from "@/lib/churchSlug";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { getTranslationRelayApiUrl } from "@/lib/translationRelayUrl";
import {
  createCaptionTrackPublisher,
  type CaptionFeed,
  type CaptionLanguage,
  type CaptionLine,
  type CaptionTrack,
} from "@/lib/translationCaptionTrack";

export type CaptionPostBody = {
  clear?: boolean;
  revision: number;
  track?: CaptionTrack;
  text?: string;
  final?: boolean;
  languageLabel?: string;
  languageCode?: string;
};

const captionPostChains = new Map<string, Promise<void>>();
let lastCaptionRevision = 0;

export function nextCaptionRevision(now = Date.now()): number {
  lastCaptionRevision = Math.max(now, lastCaptionRevision + 1);
  return lastCaptionRevision;
}

export function resetCaptionRevisionClockForTests(): void {
  lastCaptionRevision = 0;
  captionPostChains.clear();
}

function captionRequestPath(
  churchSlug: string,
  track?: CaptionTrack,
  afterSeq?: number
): string {
  const url = new URL(
    withChurchSearchParam("/api/translation-captions", churchSlug),
    "http://listen.local"
  );

  if (track) {
    url.searchParams.set("track", track);
  }

  if (afterSeq !== undefined) {
    url.searchParams.set("after", String(afterSeq));
  }

  return `${url.pathname}${url.search}`;
}

async function readCaptionError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };

    if (body.error) {
      return body.error;
    }
  } catch {
    // Ignore JSON parse failures.
  }

  return "Failed to update captions.";
}

/**
 * Headset playback must not wait on this request. Callers enqueue it and
 * return immediately.
 */
async function postTranslationCaption(
  churchSlug: string,
  body: CaptionPostBody
): Promise<void> {
  const response = await fetch(
    getTranslationRelayApiUrl(captionRequestPath(churchSlug)),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    throw new Error(await readCaptionError(response));
  }
}

function enqueueCaptionPost(
  churchSlug: string,
  body: CaptionPostBody
): Promise<void> {
  const previous = captionPostChains.get(churchSlug) ?? Promise.resolve();
  const result = previous
    .catch(() => undefined)
    .then(() => postTranslationCaption(churchSlug, body));

  captionPostChains.set(
    churchSlug,
    result.catch(() => undefined)
  );

  return result;
}

export function captionRelayError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message === "Failed to fetch" || message.includes("Headset translation still works")) {
    return "Could not reach the phone relay. Headset translation still works.";
  }

  return `${message} Headset translation still works.`;
}

export function clearTranslationCaptions(churchSlug: string): Promise<void> {
  return enqueueCaptionPost(churchSlug, {
    clear: true,
    revision: nextCaptionRevision(),
  });
}

function isCaptionLine(value: unknown): value is CaptionLine {
  if (!value || typeof value !== "object") {
    return false;
  }

  const line = value as Partial<CaptionLine>;
  return (
    typeof line.seq === "number" &&
    typeof line.text === "string" &&
    typeof line.createdAt === "number"
  );
}

export async function loadTranslationCaptions(
  churchSlug: string,
  track: CaptionTrack,
  afterSeq: number
): Promise<CaptionFeed & { churchName?: string | null }> {
  const response = await fetchWithTimeout(
    getTranslationRelayApiUrl(captionRequestPath(churchSlug, track, afterSeq)),
    { cache: "no-store" },
    4000
  );

  if (!response.ok) {
    throw new Error(await readCaptionError(response));
  }

  const data = (await response.json()) as Partial<CaptionFeed> & {
    churchName?: string | null;
    lines?: unknown;
  };

  return {
    isLive: Boolean(data.isLive),
    languageLabel: typeof data.languageLabel === "string" ? data.languageLabel : "",
    languageCode: typeof data.languageCode === "string" ? data.languageCode : "",
    latestSeq: typeof data.latestSeq === "number" ? data.latestSeq : 0,
    partial: typeof data.partial === "string" ? data.partial : "",
    lines: Array.isArray(data.lines) ? data.lines.filter(isCaptionLine) : [],
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0,
    churchName: data.churchName,
  };
}

export function createTranslationCaptionPublisher(options: {
  churchSlug: string;
  getLanguage: (track: CaptionTrack) => CaptionLanguage;
  onError: (message: string) => void;
}) {
  let lastErrorAt = 0;

  const report = (error: unknown) => {
    const now = Date.now();

    if (now - lastErrorAt < 10_000) {
      return;
    }

    lastErrorAt = now;
    options.onError(captionRelayError(error));
  };

  const send = (track: CaptionTrack, update: { text: string; final: boolean }) => {
    const language = options.getLanguage(track);

    void enqueueCaptionPost(options.churchSlug, {
      track,
      text: update.text.slice(0, 4000),
      final: update.final,
      revision: nextCaptionRevision(),
      languageLabel: language.label,
      languageCode: language.code,
    }).catch(report);
  };

  const original = createCaptionTrackPublisher((update) => {
    send("original", update);
  });
  const translation = createCaptionTrackPublisher((update) => {
    send("translation", update);
  });

  return {
    churchSlug: options.churchSlug,
    append(track: CaptionTrack, text: string) {
      if (track === "original") {
        original.append(text);
        return;
      }

      translation.append(text);
    },
    finish(track: CaptionTrack, text: string) {
      if (track === "original") {
        original.finish(text);
        return;
      }

      translation.finish(text);
    },
    clear() {
      original.reset();
      translation.reset();
      void enqueueCaptionPost(options.churchSlug, {
        clear: true,
        revision: nextCaptionRevision(),
      }).catch(report);
    },
    stop() {
      original.stop();
      translation.stop();
    },
  };
}
