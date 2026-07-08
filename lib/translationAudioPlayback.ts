import type { TranslationAudioChunk } from "@/types/translationListen";

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export class TranslationAudioChunkPlayer {
  private queue: TranslationAudioChunk[] = [];
  private processing = false;
  private stopped = false;
  private context: AudioContext | null = null;
  private nextStartTime = 0;
  private legacyPlaying = false;
  private activeLegacyAudio: HTMLAudioElement | null = null;
  chunksPlayed = 0;

  async prepare(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    this.nextStartTime = this.context.currentTime + 0.05;
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
          await this.playWavChunk(chunk.data);
        } else {
          await this.playLegacyChunk(chunk);
        }

        this.chunksPlayed += 1;
      } catch {
        // Skip chunks the phone cannot decode and continue.
      }
    }

    this.processing = false;
  }

  private async playWavChunk(base64: string): Promise<void> {
    if (!this.context) {
      await this.prepare();
    }

    const context = this.context;

    if (!context) {
      throw new Error("Audio context unavailable.");
    }

    const bytes = base64ToBytes(base64);
    const arrayBuffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer;
    const audioBuffer = await context.decodeAudioData(arrayBuffer);
    const source = context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(context.destination);

    const now = context.currentTime;

    if (this.nextStartTime < now + 0.05) {
      this.nextStartTime = now + 0.05;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
  }

  private async playLegacyChunk(chunk: TranslationAudioChunk): Promise<void> {
    if (this.legacyPlaying) {
      return;
    }

    this.legacyPlaying = true;

    const bytes = base64ToBytes(chunk.data);
    const blob = new Blob([new Uint8Array(bytes)], { type: chunk.mimeType });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    this.activeLegacyAudio = audio;

    await new Promise<void>((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(url);
        this.activeLegacyAudio = null;
        this.legacyPlaying = false;
        resolve();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        this.activeLegacyAudio = null;
        this.legacyPlaying = false;
        resolve();
      };

      void audio.play().catch(() => {
        URL.revokeObjectURL(url);
        this.activeLegacyAudio = null;
        this.legacyPlaying = false;
        resolve();
      });
    });
  }

  stop(): void {
    this.stopped = true;
    this.queue = [];
    this.processing = false;
    this.legacyPlaying = false;

    if (this.activeLegacyAudio) {
      this.activeLegacyAudio.pause();
      this.activeLegacyAudio.src = "";
      this.activeLegacyAudio = null;
    }

    void this.context?.close();
    this.context = null;
    this.nextStartTime = 0;
  }

  reset(): void {
    this.stop();
    this.stopped = false;
    this.chunksPlayed = 0;
  }
}

export async function fetchTranslationAudioAfter(afterSeq: number) {
  const response = await fetch(`/api/translation-audio?after=${afterSeq}`, {
    cache: "no-store",
  });

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
    meta: { isLive: boolean; latestSeq: number; updatedAt: number; mimeType: string };
    chunks: TranslationAudioChunk[];
  }>;
}
