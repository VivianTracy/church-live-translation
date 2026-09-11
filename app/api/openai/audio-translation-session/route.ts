import { NextResponse } from "next/server";
import {
  OPENAI_AUDIO_TRANSLATION_MODEL,
  OPENAI_TRANSCRIPTION_MODEL,
} from "@/lib/openaiModels";
import { createOpenAITranslationClientSecret } from "@/lib/openaiServer";
import {
  authorizeAudioTranslationSession,
  recordAuthorizedTranslationSession,
  resolveOutputLanguage,
} from "@/lib/audioTranslationSession";

type AudioTranslationSessionRequest = {
  outputLanguage?: string;
};

export async function POST(request: Request) {
  const authorized = await authorizeAudioTranslationSession();

  if (!authorized.ok) {
    const headers =
      authorized.status === 429 && authorized.retryAfterSeconds
        ? { "Retry-After": String(authorized.retryAfterSeconds) }
        : undefined;

    return NextResponse.json(
      { error: authorized.error },
      { status: authorized.status, headers }
    );
  }

  const body = (await request.json().catch(() => ({}))) as AudioTranslationSessionRequest;
  const outputLanguage = resolveOutputLanguage(body.outputLanguage);

  try {
    const secret = await createOpenAITranslationClientSecret(
      {
        model: OPENAI_AUDIO_TRANSLATION_MODEL,
        audio: {
          input: {
            transcription: {
              model: OPENAI_TRANSCRIPTION_MODEL,
            },
          },
          output: {
            language: outputLanguage,
          },
        },
      },
      authorized.apiKey
    );

    const sessionEventId = await recordAuthorizedTranslationSession({
      operator: authorized.operator,
      outputLanguage,
    });

    return NextResponse.json({
      clientSecret: secret.value,
      expiresAt: secret.expiresAt,
      model: OPENAI_AUDIO_TRANSLATION_MODEL,
      outputLanguage,
      sessionEventId,
    });
  } catch (error) {
    console.error("OpenAI audio translation session error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create audio translation session",
      },
      { status: 500 }
    );
  }
}
