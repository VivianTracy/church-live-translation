import type { TranslationAudioChunk } from "@/types/translationListen";
import { withChurchSearchParam } from "@/lib/churchSlug";

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

const SILENT_WAV_DATA_URL =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
const PLAYBACK_BUFFER_SECONDS = 1;

export function unlockMobileAudioPlayback(): HTMLAudioElement {
  const audio = new Audio(SILENT_WAV_DATA_URL);
  audio.setAttribute("playsinline", "true");
  audio.setAttribute("webkit-playsinline", "true");
  void audio.play().catch(() => undefined);
  return audio;
}

export class TranslationAudioChunkPlayer {
  private queue: TranslationAudioChunk[] = [];
  private processing = false;
  private stopped = false;
  private context: AudioContext | null = null;
  private nextStartTime = 0;
  private activeSources = new Set<AudioBufferSourceNode>();
  private audio: HTMLAudioElement;
  private activeUrl = "";
  chunksPlayed = 0;
  lastError = "";
  onError?: (message: string) => void;

  constructor(unlockedAudio?: HTMLAudioElement) {
    this.audio = unlockedAudio ?? new Audio();
    this.audio.setAttribute("playsinline", "true");
    this.audio.setAttribute("webkit-playsinline", "true");
  }

  async prepare(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    if (this.context.state !== "running") {
      throw new Error("This phone did not allow audio playback. Tap again.");
    }

    this.nextStartTime = this.context.currentTime + PLAYBACK_BUFFER_SECONDS;
  }

  enqueue(chunk: TranslationAudioChunk): void {
    if (this.stopped) {
      return;
    }

    this.queue.push(chunk);
    void this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.stopped) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && !this.stopped) {
      const chunk = this.queue.shift();

      if (!chunk) {
        break;
      }

      try {
        if (chunk.mimeType === "audio/wav") {
          await this.scheduleWavChunk(chunk.data);
        } else {
          await this.playLegacyChunk(chunk);
        }
        this.chunksPlayed += 1;
        this.lastError = "";
      } catch (error) {
        this.lastError =
          error instanceof Error ? error.message : "Could not play audio chunk.";
        this.onError?.(this.lastError);
      }
    }

    this.processing = false;
  }

  private async scheduleWavChunk(base64: string): Promise<void> {
    if (!this.context || this.context.state !== "running") {
      throw new Error("Phone audio is paused. Tap Listen again.");
    }

    const bytes = base64ToBytes(base64);
    const arrayBuffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer;
    const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
    const source = this.context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.context.destination);

    const earliestStart = this.context.currentTime + PLAYBACK_BUFFER_SECONDS;

    if (this.nextStartTime < this.context.currentTime) {
      this.nextStartTime = earliestStart;
    }

    this.activeSources.add(source);
    source.onended = () => {
      this.activeSources.delete(source);
      source.disconnect();
    };
    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
  }

  private playLegacyChunk(chunk: TranslationAudioChunk): Promise<void> {
    const bytes = base64ToBytes(chunk.data);
    const blob = new Blob([new Uint8Array(bytes)], { type: chunk.mimeType });
    const url = URL.createObjectURL(blob);

    if (this.activeUrl) {
      URL.revokeObjectURL(this.activeUrl);
    }

    this.activeUrl = url;
    this.audio.src = url;

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        this.audio.onended = null;
        this.audio.onerror = null;
      };

      this.audio.onended = () => {
        cleanup();
        resolve();
      };

      this.audio.onerror = () => {
        cleanup();
        reject(new Error("This phone could not play the translation audio."));
      };

      void this.audio.play().catch((error) => {
        cleanup();
        reject(error instanceof Error ? error : new Error(String(error)));
      });
    });
  }

  stop(): void {
    this.stopped = true;
    this.queue = [];
    this.processing = false;
    this.activeSources.forEach((source) => {
      source.stop();
      source.disconnect();
    });
    this.activeSources.clear();
    void this.context?.close();
    this.context = null;
    this.nextStartTime = 0;
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();

    if (this.activeUrl) {
      URL.revokeObjectURL(this.activeUrl);
      this.activeUrl = "";
    }
  }

  reset(unlockedAudio?: HTMLAudioElement): void {
    this.stop();
    this.stopped = false;
    this.chunksPlayed = 0;
    this.lastError = "";

    if (unlockedAudio) {
      this.audio = unlockedAudio;
      this.audio.setAttribute("playsinline", "true");
      this.audio.setAttribute("webkit-playsinline", "true");
    }
  }
}

export async function fetchTranslationAudioAfter(
  churchSlug: string,
  afterSeq: number
) {
  const response = await fetch(
    withChurchSearchParam(
      `/api/translation-audio?after=${afterSeq}`,
      churchSlug
    ),
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    let message = "Failed to load translation audio.";

    try {
      const body = (await response.json()) as { error?: string };

      if (body.error) {
        message = body.error;
      }
    } catch {
      // Ignore JSON parse failures.
    }

    throw new Error(message);
  }

  return response.json() as Promise<{
    meta: {
      isLive: boolean;
      latestSeq: number;
      updatedAt: number;
      mimeType: string;
    };
    chunks: TranslationAudioChunk[];
  }>;
}
