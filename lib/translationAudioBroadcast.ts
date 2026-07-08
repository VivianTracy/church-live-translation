import { startPcmChunkRecorder } from "@/lib/pcmAudioCapture";

export const TRANSLATION_BROADCAST_MIME_TYPE = "audio/wav";
const CHUNK_MS = 600;

async function readUploadError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };

    if (body.error) {
      return body.error;
    }
  } catch {
    // Ignore JSON parse failures.
  }

  return "Failed to upload translation audio.";
}

export function startTranslationAudioBroadcast(
  stream: MediaStream,
  onError: (message: string) => void
): () => void {
  let stopped = false;
  let uploadQueue = Promise.resolve();
  let lastErrorAt = 0;
  let recorder: Awaited<ReturnType<typeof startPcmChunkRecorder>> | null = null;

  const reportError = (message: string) => {
    const now = Date.now();

    if (now - lastErrorAt < 10_000) {
      return;
    }

    lastErrorAt = now;
    onError(message);
  };

  void startPcmChunkRecorder(stream, CHUNK_MS, 0, (wavBase64) => {
    if (stopped || !wavBase64) {
      return;
    }

    uploadQueue = uploadQueue
      .then(async () => {
        const response = await fetch("/api/translation-audio", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mimeType: TRANSLATION_BROADCAST_MIME_TYPE,
            data: wavBase64,
          }),
        });

        if (!response.ok) {
          throw new Error(await readUploadError(response));
        }
      })
      .catch((error) => {
        reportError(error instanceof Error ? error.message : String(error));
      });
  })
    .then((activeRecorder) => {
      if (stopped) {
        activeRecorder.stop();
        return;
      }

      recorder = activeRecorder;
    })
    .catch((error) => {
      reportError(
        error instanceof Error
          ? error.message
          : "Could not start phone audio broadcast."
      );
    });

  return () => {
    stopped = true;
    recorder?.stop();
    recorder = null;
  };
}
