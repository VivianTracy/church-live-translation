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

function wavHasAudibleAudio(base64: string): boolean {
  const bytes = base64ToBytes(base64);

  if (bytes.length <= 44) {
    return false;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const lastIndex = bytes.length - 1;

  for (let index = 44; index < lastIndex; index += 2) {
    if (Math.abs(view.getInt16(index, true)) > 80) {
      return true;
    }
  }

  return false;
}

const SILENT_WAV_DATA_URL =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

export function unlockMobileAudioPlayback(): HTMLAudioElement {
  const audio = new Audio(SILENT_WAV_DATA_URL);
  audio.preload = "auto";
  audio.muted = false;
  audio.volume = 1;
  audio.setAttribute("playsinline", "true");
  audio.setAttribute("webkit-playsinline", "true");
  audio.playsInline = true;
  void audio.play().catch(() => undefined);
  return audio;
}

export class TranslationAudioChunkPlayer {
  private queue: TranslationAudioChunk[] = [];
  private processing = false;
  private stopped = false;
  private audio: HTMLAudioElement;
  private activeUrl = "";
  chunksPlayed = 0;
  lastError = "";
  onError?: (message: string) => void;

  constructor(unlockedAudio?: HTMLAudioElement) {
    this.audio = unlockedAudio ?? new Audio();
    this.audio.preload = "auto";
    this.audio.muted = false;
    this.audio.volume = 1;
    this.audio.setAttribute("playsinline", "true");
    this.audio.setAttribute("webkit-playsinline", "true");
    this.audio.playsInline = true;
  }

  async prepare(): Promise<void> {
    this.audio.muted = false;
    this.audio.volume = 1;

    try {
      await this.audio.play();
    } catch {
      // The later chunk play() still uses this same unlocked element.
    }
  }

  enqueue(chunk: TranslationAudioChunk): void {
    if (this.stopped) {
      return;
    }

    if (chunk.mimeType === "audio/wav" && !wavHasAudibleAudio(chunk.data)) {
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
        await this.playChunk(chunk);
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

  private playChunk(chunk: TranslationAudioChunk): Promise<void> {
    const bytes = base64ToBytes(chunk.data);
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const blob = new Blob([copy], { type: chunk.mimeType || "audio/wav" });
    const url = URL.createObjectURL(blob);

    if (this.activeUrl) {
      URL.revokeObjectURL(this.activeUrl);
    }

    this.activeUrl = url;
    this.audio.src = url;
    this.audio.muted = false;
    this.audio.volume = 1;

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
      this.audio.preload = "auto";
      this.audio.muted = false;
      this.audio.volume = 1;
      this.audio.setAttribute("playsinline", "true");
      this.audio.setAttribute("webkit-playsinline", "true");
      this.audio.playsInline = true;
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
