import { NextResponse } from "next/server";
import {
  OPENAI_AUDIO_TRANSLATION_MODEL,
  OPENAI_TRANSCRIPTION_MODEL,
} from "@/lib/openaiModels";
import {
  createOpenAITranslationClientSecret,
  getOpenAIApiKey,
} from "@/lib/openaiServer";

type AudioTranslationSessionRequest = {
  outputLanguage?: string;
};

function resolveOutputLanguage(value: string | undefined): "en" | "zh" {
  return value === "zh" ? "zh" : "en";
}

export async function POST(request: Request) {
  if (!getOpenAIApiKey()) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as AudioTranslationSessionRequest;
  const outputLanguage = resolveOutputLanguage(body.outputLanguage);

  try {
    const secret = await createOpenAITranslationClientSecret({
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
    });

    return NextResponse.json({
      clientSecret: secret.value,
      expiresAt: secret.expiresAt,
      model: OPENAI_AUDIO_TRANSLATION_MODEL,
      outputLanguage,
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
