import { getTranslationRelayApiUrl } from "@/lib/translationRelayUrl";
import {
  withTranslationLineQuery,
  type TranslationAudioLine,
} from "@/lib/translationPhoneLine";

export const TRANSLATION_BROADCAST_MIME_TYPE = "audio/wav";

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

export function uploadTranslationWavChunk(
  churchSlug: string,
  wavBase64: string,
  onError: (message: string) => void,
  onUploaded?: () => void,
  line: TranslationAudioLine = "primary"
): void {
  void fetch(
    getTranslationRelayApiUrl(
      withTranslationLineQuery("/api/translation-audio", churchSlug, line)
    ),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mimeType: TRANSLATION_BROADCAST_MIME_TYPE,
        data: wavBase64,
      }),
    }
  )
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(await readUploadError(response));
      }

      onUploaded?.();
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      onError(
        message === "Failed to fetch"
          ? "Could not reach the phone relay. Headset translation still works."
          : message
      );
    });
}

export function createTranslationWavUploader(
  churchSlug: string,
  onError: (message: string) => void,
  onUploaded?: () => void,
  line: TranslationAudioLine = "primary"
) {
  let lastErrorAt = 0;

  return (wavBase64: string) => {
    if (!wavBase64) {
      return;
    }

    uploadTranslationWavChunk(
      churchSlug,
      wavBase64,
      (message) => {
        const now = Date.now();

        if (now - lastErrorAt < 10_000) {
          return;
        }

        lastErrorAt = now;
        onError(message);
      },
      onUploaded,
      line
    );
  };
}
