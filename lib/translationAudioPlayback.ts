import type { TranslationAudioChunk } from "@/types/translationListen";
import { withChurchSearchParam } from "@/lib/churchSlug";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function createPlaybackAudioContext(): AudioContext {
  const AudioContextCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextCtor) {
    throw new Error("This phone cannot play live audio.");
  }

  return new AudioContextCtor();
}

const SILENT_WAV_DATA_URL =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
const PLAYBACK_BUFFER_SECONDS = 0.8;
const UNDERRUN_PREROLL_SECONDS = 0.2;
const PLAYBACK_GAIN = 1.8;

export function unlockMobileAudioPlayback(): HTMLAudioElement {
  const audio = new Audio(SILENT_WAV_DATA_URL);
  audio.preload = "auto";
  audio.muted = false;
  audio.volume = 1;
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
  private gain: GainNode | null = null;
  private mediaDestination: MediaStreamAudioDestinationNode | null = null;
  private keepAlive: AudioBufferSourceNode | null = null;
  private nextStartTime = 0;
  private activeSources = new Set<AudioBufferSourceNode>();
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
  }

  async prepare(): Promise<void> {
    this.audio.muted = false;
    this.audio.volume = 1;
    this.audio.loop = false;
    this.audio.removeAttribute("src");
    try {
      this.audio.srcObject = null;
    } catch {
      // Older phones may not support srcObject.
    }

    if (!this.context || this.context.state === "closed") {
      this.context = createPlaybackAudioContext();
      this.gain = this.context.createGain();
      this.gain.gain.value = PLAYBACK_GAIN;
      this.mediaDestination = this.context.createMediaStreamDestination();
      this.gain.connect(this.mediaDestination);
    }

    await this.resume();

    if (this.context.state !== "running" || !this.gain || !this.mediaDestination) {
      throw new Error("This phone did not allow audio playback. Tap again.");
    }

    try {
      this.keepAlive?.stop();
    } catch {
      // Already stopped.
    }

    const silent = this.context.createBuffer(1, 1, this.context.sampleRate);
    this.keepAlive = this.context.createBufferSource();
    this.keepAlive.buffer = silent;
    this.keepAlive.loop = true;
    this.keepAlive.connect(this.gain);
    this.keepAlive.start(0);

    this.audio.srcObject = this.mediaDestination.stream;

    try {
      await Promise.race([
        this.audio.play(),
        new Promise<void>((_, reject) => {
          window.setTimeout(() => reject(new Error("play-timeout")), 800);
        }),
      ]);
    } catch {
      this.gain.connect(this.context.destination);
    }

    this.nextStartTime = this.context.currentTime + PLAYBACK_BUFFER_SECONDS;
  }

  async resume(): Promise<void> {
    if (this.stopped || !this.context) {
      return;
    }

    if (this.context.state !== "running" && this.context.state !== "closed") {
      await this.context.resume();
    }

    try {
      if (this.audio.srcObject) {
        await this.audio.play();
      }
    } catch {
      // A later tap can unlock HTML audio again.
    }

    if (this.context.state === "running" && this.nextStartTime < this.context.currentTime) {
      this.nextStartTime = this.context.currentTime + UNDERRUN_PREROLL_SECONDS;
    }
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
    await this.resume();

    if (!this.context || !this.gain || this.context.state !== "running") {
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
    source.connect(this.gain);

    const now = this.context.currentTime;

    if (this.nextStartTime < now) {
      this.nextStartTime = now + UNDERRUN_PREROLL_SECONDS;
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
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const blob = new Blob([copy], { type: chunk.mimeType });
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
    this.audio.loop = false;
    try {
      this.keepAlive?.stop();
    } catch {
      // Already stopped.
    }
    this.keepAlive = null;
    this.activeSources.forEach((source) => {
      source.stop();
      source.disconnect();
    });
    this.activeSources.clear();
    void this.context?.close();
    this.context = null;
    this.gain = null;
    this.mediaDestination = null;
    this.nextStartTime = 0;
    this.audio.pause();
    this.audio.srcObject = null;
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
    }
  }
}

export async function fetchTranslationAudioAfter(
  churchSlug: string,
  afterSeq: number
) {
  const response = await fetchWithTimeout(
    withChurchSearchParam(
      `/api/translation-audio?after=${afterSeq}`,
      churchSlug
    ),
    {
      cache: "no-store",
    },
    6000
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
