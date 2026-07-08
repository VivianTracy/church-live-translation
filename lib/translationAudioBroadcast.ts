const MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

const MAX_CHUNK_BASE64_LENGTH = 120_000;
const UPLOAD_INTERVAL_MS = 800;

export function getTranslationRecordingMimeType(): string {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  return MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") {
        reject(new Error("Could not encode audio chunk."));
        return;
      }

      const base64 = result.split(",")[1];

      if (!base64) {
        reject(new Error("Could not encode audio chunk."));
        return;
      }

      resolve(base64);
    };

    reader.onerror = () => reject(new Error("Could not read audio chunk."));
    reader.readAsDataURL(blob);
  });
}

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
  const mimeType = getTranslationRecordingMimeType();

  if (!mimeType) {
    onError("This browser cannot record translated audio for phone listeners.");
    return () => undefined;
  }

  let stopped = false;
  let uploadQueue = Promise.resolve();
  let lastErrorAt = 0;

  const reportError = (message: string) => {
    const now = Date.now();

    if (now - lastErrorAt < 10_000) {
      return;
    }

    lastErrorAt = now;
    onError(message);
  };

  const recorder = new MediaRecorder(stream, {
    mimeType,
    audioBitsPerSecond: 24000,
  });

  recorder.addEventListener("dataavailable", (event) => {
    if (stopped || event.data.size === 0) {
      return;
    }

    uploadQueue = uploadQueue
      .then(async () => {
        const data = await blobToBase64(event.data);

        if (data.length > MAX_CHUNK_BASE64_LENGTH) {
          return;
        }

        const response = await fetch("/api/translation-audio", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ mimeType, data }),
        });

        if (!response.ok) {
          throw new Error(await readUploadError(response));
        }
      })
      .catch((error) => {
        reportError(error instanceof Error ? error.message : String(error));
      });
  });

  recorder.start(UPLOAD_INTERVAL_MS);

  return () => {
    stopped = true;

    if (recorder.state !== "inactive") {
      recorder.stop();
    }
  };
}
