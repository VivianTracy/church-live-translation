import { NextResponse } from "next/server";
import {
  OPENAI_AUDIO_TRANSLATION_LANGUAGE,
  OPENAI_AUDIO_TRANSLATION_MODEL,
  OPENAI_TRANSCRIPTION_MODEL,
} from "@/lib/openaiModels";
import {
  createOpenAITranslationClientSecret,
  getOpenAIApiKey,
} from "@/lib/openaiServer";

export async function POST() {
  if (!getOpenAIApiKey()) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 500 }
    );
  }

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
          language: OPENAI_AUDIO_TRANSLATION_LANGUAGE,
        },
      },
    });

    return NextResponse.json({
      clientSecret: secret.value,
      expiresAt: secret.expiresAt,
      model: OPENAI_AUDIO_TRANSLATION_MODEL,
      outputLanguage: OPENAI_AUDIO_TRANSLATION_LANGUAGE,
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
