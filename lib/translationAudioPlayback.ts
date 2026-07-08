import type { TranslationAudioChunk } from "@/types/translationListen";

export class TranslationAudioChunkPlayer {
  private queue: Blob[] = [];
  private playing = false;
  private activeAudio: HTMLAudioElement | null = null;
  private stopped = false;

  enqueue(chunk: TranslationAudioChunk): void {
    if (this.stopped) {
      return;
    }

    const binary = atob(chunk.data);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    this.queue.push(new Blob([bytes], { type: chunk.mimeType }));
    void this.playNext();
  }

  private async playNext(): Promise<void> {
    if (this.stopped || this.playing || this.queue.length === 0) {
      return;
    }

    this.playing = true;
    const blob = this.queue.shift();

    if (!blob) {
      this.playing = false;
      return;
    }

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    this.activeAudio = audio;

    audio.onended = () => {
      URL.revokeObjectURL(url);
      this.playing = false;
      this.activeAudio = null;
      void this.playNext();
    };

    audio.onerror = () => {
      URL.revokeObjectURL(url);
      this.playing = false;
      this.activeAudio = null;
      void this.playNext();
    };

    try {
      await audio.play();
    } catch {
      URL.revokeObjectURL(url);
      this.playing = false;
      this.activeAudio = null;
    }
  }

  stop(): void {
    this.stopped = true;
    this.queue = [];
    this.playing = false;

    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio.currentTime = 0;
      this.activeAudio.src = "";
      this.activeAudio.load();
      this.activeAudio = null;
    }
  }

  reset(): void {
    this.stop();
    this.stopped = false;
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
