import {
  EMPTY_TRANSLATION_AUDIO_META,
  type TranslationAudioChunk,
  type TranslationAudioMeta,
  type TranslationListenState,
} from "@/types/translationListen";
import { redis } from "@/lib/redis";
import { isLocalCaptionStorage } from "@/lib/storageMode";

const META_KEY = "translation-audio-meta";
const CHUNKS_KEY = "translation-audio-chunks";
const SEQ_KEY = "translation-audio-seq";
const MAX_STORED_CHUNKS = 48;

let localMeta: TranslationAudioMeta = { ...EMPTY_TRANSLATION_AUDIO_META };
let localChunks: TranslationAudioChunk[] = [];

function parseChunk(raw: unknown): TranslationAudioChunk | null {
  if (!raw || typeof raw !== "string") {
    return null;
  }

  try {
    return JSON.parse(raw) as TranslationAudioChunk;
  } catch {
    return null;
  }
}

export function isTranslationRelayConfigured(): boolean {
  return !isLocalCaptionStorage();
}

export async function getTranslationAudioMeta(): Promise<TranslationAudioMeta> {
  if (isLocalCaptionStorage()) {
    return localMeta;
  }

  const meta = await redis.get<TranslationAudioMeta>(META_KEY);

  return meta ?? EMPTY_TRANSLATION_AUDIO_META;
}

export async function setTranslationListenLive(isLive: boolean): Promise<void> {
  if (isLocalCaptionStorage()) {
    const updatedAt = Date.now();

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

  const updatedAt = Date.now();

  if (!isLive) {
    await redis
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

  await redis.set(META_KEY, {
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

  if (isLocalCaptionStorage()) {
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

  const seq = await redis.incr(SEQ_KEY);
  const chunk: TranslationAudioChunk = {
    seq,
    mimeType,
    data,
    createdAt,
  };

  await redis
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

  if (isLocalCaptionStorage()) {
    return {
      meta,
      chunks: localChunks.filter((chunk) => chunk.seq > afterSeq),
    };
  }

  const rawChunks = await redis.lrange<string>(CHUNKS_KEY, 0, -1);
  const chunks = rawChunks
    .map(parseChunk)
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
