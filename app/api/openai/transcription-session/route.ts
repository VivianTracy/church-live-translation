import { NextResponse } from "next/server";
import {
  OPENAI_TRANSCRIPTION_DELAY,
  OPENAI_TRANSCRIPTION_LANGUAGE,
  OPENAI_TRANSCRIPTION_MODEL,
} from "@/lib/openaiModels";
import { createOpenAIClientSecret, getOpenAIApiKey } from "@/lib/openaiServer";

export async function POST() {
  if (!getOpenAIApiKey()) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const secret = await createOpenAIClientSecret({
      type: "transcription",
      audio: {
        input: {
          format: {
            type: "audio/pcm",
            rate: 24000,
          },
          transcription: {
            model: OPENAI_TRANSCRIPTION_MODEL,
            language: OPENAI_TRANSCRIPTION_LANGUAGE,
            delay: OPENAI_TRANSCRIPTION_DELAY,
          },
          turn_detection: null,
        },
      },
    });

    return NextResponse.json({
      clientSecret: secret.value,
      expiresAt: secret.expiresAt,
      model: OPENAI_TRANSCRIPTION_MODEL,
      language: OPENAI_TRANSCRIPTION_LANGUAGE,
    });
  } catch (error) {
    console.error("OpenAI transcription session error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create transcription session",
      },
      { status: 500 }
    );
  }
}
