import { isLocalListenStorage } from "@/lib/listenStorageMode";
import { redis } from "@/lib/redis";
import {
  applyCaptionClear,
  applyCaptionUpdateToSnapshot,
  CAPTION_TRACKS,
  emptyCaptionSnapshot,
  type CaptionSnapshot,
  type CaptionTrack,
} from "@/lib/translationCaptionTrack";

type CaptionUpdate = {
  text: string;
  final: boolean;
  languageLabel: string;
  languageCode: string;
  revision: number;
};

const localCaptions = new Map<string, CaptionSnapshot>();

export function translationCaptionRedisKey(
  churchSlug: string,
  track: CaptionTrack
): string {
  return `translation-captions:${churchSlug}:${track}`;
}

function localKey(churchSlug: string, track: CaptionTrack): string {
  return `${churchSlug}:${track}`;
}

function requireRedis() {
  if (!redis) {
    throw new Error(
      "Caption relay requires Redis. Set KV_REST_API_URL and KV_REST_API_TOKEN on your deployed site."
    );
  }

  return redis;
}

function cloneSnapshot(snapshot: CaptionSnapshot): CaptionSnapshot {
  return {
    ...snapshot,
    lines: snapshot.lines.map((line) => ({ ...line })),
  };
}

export function parseCaptionSnapshot(raw: unknown): CaptionSnapshot | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const value = raw as Partial<CaptionSnapshot>;

  if (
    typeof value.isLive !== "boolean" ||
    typeof value.languageLabel !== "string" ||
    typeof value.languageCode !== "string" ||
    typeof value.latestSeq !== "number" ||
    typeof value.revision !== "number" ||
    typeof value.partial !== "string" ||
    typeof value.updatedAt !== "number" ||
    !Array.isArray(value.lines)
  ) {
    return null;
  }

  const lines = value.lines.filter(
    (line): line is CaptionSnapshot["lines"][number] => {
      if (!line || typeof line !== "object") {
        return false;
      }

      const item = line as Partial<CaptionSnapshot["lines"][number]>;
      return (
        typeof item.seq === "number" &&
        typeof item.text === "string" &&
        typeof item.createdAt === "number"
      );
    }
  );

  return {
    isLive: value.isLive,
    languageLabel: value.languageLabel,
    languageCode: value.languageCode,
    latestSeq: value.latestSeq,
    revision: value.revision,
    partial: value.partial,
    lines,
    updatedAt: value.updatedAt,
  };
}

async function readCaptionSnapshot(
  churchSlug: string,
  track: CaptionTrack
): Promise<CaptionSnapshot> {
  if (isLocalListenStorage()) {
    return cloneSnapshot(
      localCaptions.get(localKey(churchSlug, track)) ?? emptyCaptionSnapshot()
    );
  }

  try {
    const raw = await requireRedis().get<unknown>(
      translationCaptionRedisKey(churchSlug, track)
    );
    return parseCaptionSnapshot(raw) ?? emptyCaptionSnapshot();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not reach Upstash Redis (${message}). On Vercel, use the REST URL and REST token, then Redeploy.`
    );
  }
}

async function writeCaptionSnapshot(
  churchSlug: string,
  track: CaptionTrack,
  snapshot: CaptionSnapshot
): Promise<void> {
  if (isLocalListenStorage()) {
    localCaptions.set(localKey(churchSlug, track), cloneSnapshot(snapshot));
    return;
  }

  try {
    await requireRedis().set(
      translationCaptionRedisKey(churchSlug, track),
      snapshot
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not reach Upstash Redis (${message}). On Vercel, use the REST URL and REST token, then Redeploy.`
    );
  }
}

export async function getTranslationCaptionSnapshot(
  churchSlug: string,
  track: CaptionTrack
): Promise<CaptionSnapshot> {
  return readCaptionSnapshot(churchSlug, track);
}

export async function updateTranslationCaption(
  churchSlug: string,
  track: CaptionTrack,
  update: CaptionUpdate
): Promise<CaptionSnapshot> {
  const current = await readCaptionSnapshot(churchSlug, track);
  const next = applyCaptionUpdateToSnapshot(current, {
    ...update,
    now: Date.now(),
  });

  if (!next) {
    return current;
  }

  await writeCaptionSnapshot(churchSlug, track, next);
  return next;
}

export async function clearTranslationCaptionSnapshots(
  churchSlug: string,
  revision: number
): Promise<void> {
  const now = Date.now();

  await Promise.all(
    CAPTION_TRACKS.map(async (track) => {
      const current = await readCaptionSnapshot(churchSlug, track);
      const next = applyCaptionClear(current, revision, now);

      if (!next) {
        return;
      }

      await writeCaptionSnapshot(churchSlug, track, next);
    })
  );
}
