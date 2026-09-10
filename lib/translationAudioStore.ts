import { isLocalListenStorage } from "@/lib/listenStorageMode";
import { redis } from "@/lib/redis";
import {
  EMPTY_TRANSLATION_AUDIO_META,
  type TranslationAudioChunk,
  type TranslationAudioMeta,
  type TranslationListenState,
} from "@/types/translationListen";

const META_KEY = "translation-audio-meta";
const CHUNKS_KEY = "translation-audio-chunks";
const SEQ_KEY = "translation-audio-seq";
const MAX_STORED_CHUNKS = 48;

let localMeta: TranslationAudioMeta = { ...EMPTY_TRANSLATION_AUDIO_META };
let localChunks: TranslationAudioChunk[] = [];

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

export async function getTranslationAudioMeta(): Promise<TranslationAudioMeta> {
  if (isLocalListenStorage()) {
    return localMeta;
  }

  try {
    const meta = await requireRedis().get<TranslationAudioMeta>(META_KEY);
    return meta ?? EMPTY_TRANSLATION_AUDIO_META;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not reach Upstash Redis (${message}). On Vercel, use the REST URL and REST token, then Redeploy.`
    );
  }
}

export async function setTranslationListenLive(isLive: boolean): Promise<void> {
  const updatedAt = Date.now();

  if (isLocalListenStorage()) {
    if (!isLive) {
      localChunks = [];
      localMeta = {
        ...EMPTY_TRANSLATION_AUDIO_META,
        updatedAt,
      };
      return;
    }

    localMeta = {
      ...localMeta,
      isLive: true,
      updatedAt,
    };
    return;
  }

  const client = requireRedis();

  if (!isLive) {
    await client
      .pipeline()
      .del(CHUNKS_KEY)
      .del(SEQ_KEY)
      .set(META_KEY, {
        ...EMPTY_TRANSLATION_AUDIO_META,
        updatedAt,
      })
      .exec();
    return;
  }

  const meta = await getTranslationAudioMeta();

  await client.set(META_KEY, {
    ...meta,
    isLive: true,
    updatedAt,
  });
}

export async function appendTranslationAudioChunk(
  mimeType: string,
  data: string
): Promise<TranslationAudioChunk> {
  const createdAt = Date.now();

  if (isLocalListenStorage()) {
    const seq = localMeta.latestSeq + 1;
    const chunk: TranslationAudioChunk = {
      seq,
      mimeType,
      data,
      createdAt,
    };

    localChunks.push(chunk);

    if (localChunks.length > MAX_STORED_CHUNKS) {
      localChunks = localChunks.slice(-MAX_STORED_CHUNKS);
    }

    localMeta = {
      ...localMeta,
      isLive: true,
      latestSeq: seq,
      mimeType,
      updatedAt: createdAt,
    };

    return chunk;
  }

  const client = requireRedis();
  const seq = await client.incr(SEQ_KEY);
  const chunk: TranslationAudioChunk = {
    seq,
    mimeType,
    data,
    createdAt,
  };

  await client
    .pipeline()
    .rpush(CHUNKS_KEY, JSON.stringify(chunk))
    .ltrim(CHUNKS_KEY, -MAX_STORED_CHUNKS, -1)
    .set(META_KEY, {
      isLive: true,
      latestSeq: seq,
      mimeType,
      updatedAt: createdAt,
    })
    .exec();

  return chunk;
}

export async function getTranslationAudioChunksAfter(
  afterSeq: number
): Promise<{ meta: TranslationAudioMeta; chunks: TranslationAudioChunk[] }> {
  const meta = await getTranslationAudioMeta();

  if (meta.latestSeq <= afterSeq) {
    return { meta, chunks: [] };
  }

  if (isLocalListenStorage()) {
    return {
      meta,
      chunks: localChunks.filter((chunk) => chunk.seq > afterSeq),
    };
  }

  const rawChunks = await requireRedis().lrange<unknown>(CHUNKS_KEY, 0, -1);
  const chunks = rawChunks
    .map(parseTranslationAudioChunk)
    .filter((chunk): chunk is TranslationAudioChunk => chunk !== null)
    .filter((chunk) => chunk.seq > afterSeq);

  return { meta, chunks };
}

export async function getTranslationListenState(): Promise<TranslationListenState> {
  const meta = await getTranslationAudioMeta();

  return {
    isLive: meta.isLive,
    updatedAt: meta.updatedAt,
  };
}
