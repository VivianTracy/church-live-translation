export class OpenAITranscriptionError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OpenAITranscriptionError";
    this.status = status;
  }
}

export async function transcribeWavChunk(base64Wav: string): Promise<string> {
  const response = await fetch("/api/openai/transcribe-audio", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ audio: base64Wav }),
  });

  let data: {
    transcript?: string;
    error?: string;
  };

  try {
    data = await response.json();
  } catch {
    throw new OpenAITranscriptionError(
      `OpenAI transcribe API returned non-JSON (${response.status})`,
      response.status
    );
  }

  if (!response.ok) {
    throw new OpenAITranscriptionError(
      data.error ?? `OpenAI transcribe API error (${response.status})`,
      response.status
    );
  }

  return data.transcript?.trim() ?? "";
}
