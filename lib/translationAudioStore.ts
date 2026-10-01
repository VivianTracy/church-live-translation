import { isLocalListenStorage } from "@/lib/listenStorageMode";
import { redis } from "@/lib/redis";
import {
  EMPTY_TRANSLATION_AUDIO_META,
  type TranslationAudioChunk,
  type TranslationAudioMeta,
  type TranslationListenState,
} from "@/types/translationListen";

const MAX_STORED_CHUNKS = 48;

type LocalStream = {
  meta: TranslationAudioMeta;
  chunks: TranslationAudioChunk[];
};

const localStreams = new Map<string, LocalStream>();

export function translationAudioRedisKeys(churchSlug: string) {
  return {
    meta: `translation-audio-meta:${churchSlug}`,
    chunks: `translation-audio-chunks:${churchSlug}`,
    seq: `translation-audio-seq:${churchSlug}`,
  };
}

export function parseTranslationAudioChunk(
  raw: unknown
): TranslationAudioChunk | null {
  if (!raw) {
    return null;
  }

  let value: unknown = raw;

  try {
    if (typeof raw === "string") {
      value = JSON.parse(raw);
    }
  } catch {
    return null;
  }

  if (typeof value !== "object" || value === null) {
    return null;
  }

  const chunk = value as Partial<TranslationAudioChunk>;

  if (
    typeof chunk.seq !== "number" ||
    typeof chunk.mimeType !== "string" ||
    typeof chunk.data !== "string" ||
    typeof chunk.createdAt !== "number"
  ) {
    return null;
  }

  return chunk as TranslationAudioChunk;
}

function requireRedis() {
  if (!redis) {
    throw new Error(
      "Phone audio relay requires Redis. Set KV_REST_API_URL and KV_REST_API_TOKEN on your deployed site."
    );
  }

  return redis;
}

export function isTranslationRelayConfigured(): boolean {
  return !isLocalListenStorage();
}

function getLocalStream(churchSlug: string): LocalStream {
  const existing = localStreams.get(churchSlug);

  if (existing) {
    return existing;
  }

  const created: LocalStream = {
    meta: { ...EMPTY_TRANSLATION_AUDIO_META },
    chunks: [],
  };
  localStreams.set(churchSlug, created);
  return created;
}

export async function getTranslationAudioMeta(
  churchSlug: string
): Promise<TranslationAudioMeta> {
  if (isLocalListenStorage()) {
    return getLocalStream(churchSlug).meta;
  }

  try {
    const meta = await requireRedis().get<TranslationAudioMeta>(
      translationAudioRedisKeys(churchSlug).meta
    );
    return meta ?? EMPTY_TRANSLATION_AUDIO_META;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not reach Upstash Redis (${message}). On Vercel, use the REST URL and REST token, then Redeploy.`
    );
  }
}

export async function setTranslationListenLive(
  churchSlug: string,
  isLive: boolean
): Promise<void> {
  const updatedAt = Date.now();

  if (isLocalListenStorage()) {
    const stream = getLocalStream(churchSlug);

    if (!isLive) {
      stream.chunks = [];
      stream.meta = {
        ...EMPTY_TRANSLATION_AUDIO_META,
        updatedAt,
      };
      return;
    }

    stream.meta = {
      ...stream.meta,
      isLive: true,
      updatedAt,
    };
    return;
  }

  const client = requireRedis();
  const keys = translationAudioRedisKeys(churchSlug);

  if (!isLive) {
    await client
      .pipeline()
      .del(keys.chunks)
      .del(keys.seq)
      .set(keys.meta, {
        ...EMPTY_TRANSLATION_AUDIO_META,
        updatedAt,
      })
      .exec();
    return;
  }

  const meta = await getTranslationAudioMeta(churchSlug);

  await client.set(keys.meta, {
    ...meta,
    isLive: true,
    updatedAt,
  });
}

export async function appendTranslationAudioChunk(
  churchSlug: string,
  mimeType: string,
  data: string
): Promise<TranslationAudioChunk> {
  const createdAt = Date.now();

  if (isLocalListenStorage()) {
    const stream = getLocalStream(churchSlug);
    const seq = stream.meta.latestSeq + 1;
    const chunk: TranslationAudioChunk = {
      seq,
      mimeType,
      data,
      createdAt,
    };

    stream.chunks.push(chunk);

    if (stream.chunks.length > MAX_STORED_CHUNKS) {
      stream.chunks = stream.chunks.slice(-MAX_STORED_CHUNKS);
    }

    stream.meta = {
      ...stream.meta,
      isLive: true,
      latestSeq: seq,
      mimeType,
      updatedAt: createdAt,
    };

    return chunk;
  }

  const client = requireRedis();
  const keys = translationAudioRedisKeys(churchSlug);
  const seq = await client.incr(keys.seq);
  const chunk: TranslationAudioChunk = {
    seq,
    mimeType,
    data,
    createdAt,
  };

  await client
    .pipeline()
    .rpush(keys.chunks, JSON.stringify(chunk))
    .ltrim(keys.chunks, -MAX_STORED_CHUNKS, -1)
    .set(keys.meta, {
      isLive: true,
      latestSeq: seq,
      mimeType,
      updatedAt: createdAt,
    })
    .exec();

  return chunk;
}

export async function getTranslationAudioChunksAfter(
  churchSlug: string,
  afterSeq: number
): Promise<{ meta: TranslationAudioMeta; chunks: TranslationAudioChunk[] }> {
  const meta = await getTranslationAudioMeta(churchSlug);

  if (meta.latestSeq <= afterSeq) {
    return { meta, chunks: [] };
  }

  if (isLocalListenStorage()) {
    return {
      meta,
      chunks: getLocalStream(churchSlug).chunks.filter(
        (chunk) => chunk.seq > afterSeq
      ),
    };
  }

  const rawChunks = await requireRedis().lrange<unknown>(
    translationAudioRedisKeys(churchSlug).chunks,
    0,
    -1
  );
  const chunks = rawChunks
    .map(parseTranslationAudioChunk)
    .filter((chunk): chunk is TranslationAudioChunk => chunk !== null)
    .filter((chunk) => chunk.seq > afterSeq);

  return { meta, chunks };
}

export async function getTranslationListenState(
  churchSlug: string
): Promise<TranslationListenState> {
  const meta = await getTranslationAudioMeta(churchSlug);

  return {
    isLive: meta.isLive,
    updatedAt: meta.updatedAt,
  };
}
