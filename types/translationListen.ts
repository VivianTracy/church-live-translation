export type TranslationListenState = {
  isLive: boolean;
  updatedAt: number;
};

export type TranslationAudioMeta = TranslationListenState & {
  latestSeq: number;
  mimeType: string;
};

export type TranslationAudioChunk = {
  seq: number;
  mimeType: string;
  data: string;
  createdAt: number;
};

export const EMPTY_TRANSLATION_LISTEN_STATE: TranslationListenState = {
  isLive: false,
  updatedAt: 0,
};

export const EMPTY_TRANSLATION_AUDIO_META: TranslationAudioMeta = {
  isLive: false,
  updatedAt: 0,
  latestSeq: 0,
  mimeType: "audio/webm;codecs=opus",
};

export function isTranslationSessionLive(
  listenState: TranslationListenState,
  meta: TranslationAudioMeta
): boolean {
  return listenState.isLive || meta.isLive || meta.latestSeq > 0;
}
