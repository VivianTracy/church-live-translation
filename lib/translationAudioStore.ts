import {
  EMPTY_TRANSLATION_AUDIO_META,
  type TranslationAudioChunk,
  type TranslationAudioMeta,
  type TranslationListenState,
} from "@/types/translationListen";
import { redis } from "@/lib/redis";
import { isLocalCaptionStorage } from "@/lib/storageMode";

const META_KEY = "translation-audio-meta";
const CHUNK_KEY_PREFIX = "translation-audio-chunk:";
const MAX_STORED_CHUNKS = 80;
const CHUNK_TTL_SECONDS = 300;

let localMeta: TranslationAudioMeta = { ...EMPTY_TRANSLATION_AUDIO_META };
let localChunks = new Map<number, TranslationAudioChunk>();

function chunkKey(seq: number): string {
  return `${CHUNK_KEY_PREFIX}${seq}`;
}

async function deleteOldChunks(latestSeq: number): Promise<void> {
  const oldestToKeep = latestSeq - MAX_STORED_CHUNKS;

  if (isLocalCaptionStorage()) {
    for (const seq of localChunks.keys()) {
      if (seq < oldestToKeep) {
        localChunks.delete(seq);
      }
    }

    return;
  }

  if (oldestToKeep <= 0) {
    return;
  }

  const deletions = [];

  for (let seq = oldestToKeep - 10; seq < oldestToKeep; seq += 1) {
    if (seq > 0) {
      deletions.push(redis.del(chunkKey(seq)));
    }
  }

  await Promise.all(deletions);
}

export async function getTranslationAudioMeta(): Promise<TranslationAudioMeta> {
  if (isLocalCaptionStorage()) {
    return localMeta;
  }

  const meta = await redis.get<TranslationAudioMeta>(META_KEY);

  return meta ?? EMPTY_TRANSLATION_AUDIO_META;
}

export async function setTranslationListenLive(isLive: boolean): Promise<void> {
  const updatedAt = Date.now();
  const meta = await getTranslationAudioMeta();
  const nextMeta: TranslationAudioMeta = {
    ...meta,
    isLive,
    updatedAt,
  };

  if (isLocalCaptionStorage()) {
    localMeta = nextMeta;

    if (!isLive) {
      localChunks.clear();
      localMeta = {
        ...EMPTY_TRANSLATION_AUDIO_META,
        updatedAt,
      };
    }

    return;
  }

  if (!isLive) {
    await clearTranslationAudio();
    await redis.set(META_KEY, {
      ...EMPTY_TRANSLATION_AUDIO_META,
      updatedAt,
    });
    return;
  }

  await redis.set(META_KEY, nextMeta);
}

export async function appendTranslationAudioChunk(
  mimeType: string,
  data: string
): Promise<TranslationAudioChunk> {
  const meta = await getTranslationAudioMeta();
  const seq = meta.latestSeq + 1;
  const chunk: TranslationAudioChunk = {
    seq,
    mimeType,
    data,
    createdAt: Date.now(),
  };

  const nextMeta: TranslationAudioMeta = {
    ...meta,
    isLive: true,
    latestSeq: seq,
    mimeType,
    updatedAt: chunk.createdAt,
  };

  if (isLocalCaptionStorage()) {
    localMeta = nextMeta;
    localChunks.set(seq, chunk);
    await deleteOldChunks(seq);
    return chunk;
  }

  await Promise.all([
    redis.set(META_KEY, nextMeta),
    redis.set(chunkKey(seq), chunk, { ex: CHUNK_TTL_SECONDS }),
  ]);
  await deleteOldChunks(seq);

  return chunk;
}

export async function getTranslationAudioChunksAfter(
  afterSeq: number
): Promise<{ meta: TranslationAudioMeta; chunks: TranslationAudioChunk[] }> {
  const meta = await getTranslationAudioMeta();

  if (meta.latestSeq <= afterSeq) {
    return { meta, chunks: [] };
  }

  const chunks: TranslationAudioChunk[] = [];

  if (isLocalCaptionStorage()) {
    for (let seq = afterSeq + 1; seq <= meta.latestSeq; seq += 1) {
      const chunk = localChunks.get(seq);

      if (chunk) {
        chunks.push(chunk);
      }
    }

    return { meta, chunks };
  }

  for (let seq = afterSeq + 1; seq <= meta.latestSeq; seq += 1) {
    const chunk = await redis.get<TranslationAudioChunk>(chunkKey(seq));

    if (chunk) {
      chunks.push(chunk);
    }
  }

  return { meta, chunks };
}

export async function clearTranslationAudio(): Promise<void> {
  if (isLocalCaptionStorage()) {
    localChunks.clear();
    localMeta = { ...EMPTY_TRANSLATION_AUDIO_META };
    return;
  }

  const meta = await getTranslationAudioMeta();
  const deletions = [];

  for (let seq = Math.max(1, meta.latestSeq - MAX_STORED_CHUNKS); seq <= meta.latestSeq; seq += 1) {
    deletions.push(redis.del(chunkKey(seq)));
  }

  await Promise.all(deletions);
}

export async function getTranslationListenState(): Promise<TranslationListenState> {
  const meta = await getTranslationAudioMeta();

  return {
    isLive: meta.isLive,
    updatedAt: meta.updatedAt,
  };
}
